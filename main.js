document.addEventListener('DOMContentLoaded', function() {
  // Event listeners
  document.getElementById('add-dropdown-button').addEventListener('click', addNewDropdown);
  document.getElementById('fetch-button').addEventListener('click', gatherData);
  
  fetchAllSkills();
});

function fetchAllSkills() {
  fetch('https://mhw-db.com/skills')
      .then(response => response.json())
      .then(skillsData => {
          // Store the skills data to reuse for additional dropdowns
          window.skillsData = skillsData;
          // Create and populate the initial dropdown
          addNewDropdown(skillsData);
      })
      .catch(error => console.error('Error fetching skills data:', error));
}

function createUniqueId() {
  return 'dropdown-' + Math.random().toString(36).substr(2, 9);
}

function populateSkillDropdown(dropdown, skillsData) {
  const choices = [];
  
  skillsData.forEach(skill => {
      // Add group label
      choices.push({
          label: skill.name,
          id: skill.name,
          disabled: true,
          choices: skill.ranks.map(rank => ({
              value: JSON.stringify({
                  id: rank.id,
                  skillName: skill.name,
                  skillLevel: rank.level
              }),
              label: `${skill.name} - ${rank.level}`,
              customProperties: {
                  description: rank.description
              }
          }))
      });
  });

  // Initialize Choices.js
  const choicesInstance = new Choices(dropdown, {
      choices: choices,
      placeholderValue: 'Search for a skill...',
      searchPlaceholderValue: 'Type to search...',
      removeItemButton: true,
      searchFields: ['label'],
      renderChoiceLimit: -1,
      searchResultLimit: 100,
      itemSelectText: '',
      classNames: {
          containerOuter: 'choices w-full',
          input: 'choices__input--cloned',
      }
  });

  // Add tooltip functionality
  dropdown.addEventListener('choice', function(event) {
      const data = JSON.parse(event.detail.choice.value);
      this.setAttribute('title', data.description);
  });

  return choicesInstance;
}

function addNewDropdown() {
  // Create wrapper div
  const wrapper = document.createElement('div');
  wrapper.className = 'flex items-center gap-2';
  
  // Create container for the dropdown
  const dropdownContainer = document.createElement('div');
  dropdownContainer.className = 'w-full';
  
  // Create a new dropdown element
  const newDropdown = document.createElement('select');
  const dropdownId = createUniqueId();
  newDropdown.id = dropdownId;
  newDropdown.className = 'w-full';
  
  // Add remove button
  const removeButton = document.createElement('button');
  removeButton.textContent = '×';
  removeButton.className = 'px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600';
  removeButton.onclick = function() {
      wrapper.remove();
  };
  
  // Add elements to container
  dropdownContainer.appendChild(newDropdown);
  wrapper.appendChild(dropdownContainer);
  wrapper.appendChild(removeButton);
  document.getElementById('dropdown-container').appendChild(wrapper);
  
  // Populate with existing skills data
  if (window.skillsData) {
      populateSkillDropdown(newDropdown, window.skillsData);
  }
}

//Central function
function gatherData() {
  const dropdowns = document.querySelectorAll('select');
  const fetchDatas = [];
  const skillLists= [];

  dropdowns.forEach(dropdown => {
    const selectedValue = dropdown.value;

    if (selectedValue) {
      try {
        const parsedValue = JSON.parse(selectedValue);
        skillLists.push({skillName:parsedValue.skillName, skillLevel:parsedValue.skillLevel});
        const fetchData = formatedParams(parsedValue) // Fetch data for each dropdown value
          .then(response => {
            console.log('Response from fetch:', response);
            return response; // Return response to be collected in storedData
          });
          fetchDatas.push({ skillName: parsedValue.skillName, promise: fetchData }); // Store promise
      } catch (error) {
        console.error('Failed to parse selected value:', error);
      }
    }
  });

  //Wait for all pending jobs then create a new array(responses) but only the promise (item.promise) [promise1, promise2]
  Promise.all(fetchDatas.map(item => item.promise)).then(responses => {
    // At this point we have 2 things fetchDatas with the skill name and its promise and responses which is the array of response of promise
    const armorData = {};
    // Map the armorData object with for each with index since we have a response array we can use the index of this loop to look for the equivalent promise to the item.skilName
    fetchDatas.forEach((item, index) => {
      armorData[item.skillName] = responses[index];
    });

    const combinations = findArmorCombinations(skillLists, armorData); // Now passes structured data to displayArmor
    displayCombinations(combinations);
  });
}

// Build parameter with MongoDB Style as per MHWDB documentation
function formatedParams(selectedSkills) {
  const query = `{"skills.skillName":"${selectedSkills.skillName}"}`; // ,"skills.id":"${selectedSkills.id}"
  console.log(query);
  const encodedQueryString = encodeURIComponent(query);
  console.log(encodedQueryString);

  // Call fetchArmor and return the promise
  return fetchArmor(encodedQueryString);
}

// API Request
function fetchArmor(encodedQueryString) {
  return fetch(`https://mhw-db.com/armor?q=${encodedQueryString}`)
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json(); // Returning the promise of JSON data
    })
    .catch(error => console.error('Error fetching data:', error));
}

function findArmorCombinations(skillLists, armorData) {
  // Convert skillLists to a map for easier lookup
  const requiredSkills = new Map(
      skillLists.map(skill => [skill.skillName, skill.skillLevel])
  );

  // Helper function to create a unique key for armor piece
  function createArmorKey(armor) {
      return `${armor.name}_${armor.type}`;
  }

  // Helper function to create a unique key for combination
  function createCombinationKey(combination) {
      return combination
          .map(armor => createArmorKey(armor))
          .sort()
          .join('|');
  }

  // Separate armor by type and remove duplicates
  const armorByType = {
      head: [],
      chest: [],
      gloves: [],
      waist: [],
      legs: []
  };

  // Set to keep track of seen armor pieces
  const seenArmor = new Set();

  // Populate armor pieces by type, avoiding duplicates
  for (const skillName in armorData) {
      armorData[skillName].forEach(armor => {
          if (armor.skills && armor.skills.length > 0) {
              const armorKey = createArmorKey(armor);
              if (!seenArmor.has(armorKey)) {
                  seenArmor.add(armorKey);
                  armorByType[armor.type].push(armor);
              }
          }
      });
  }

  const validCombinations = new Set();
  const COMBINATION_LIMIT = 20;

  // Helper function to check if a combination meets skill requirements
  function checkSkillRequirements(combination) {
      const skillTotals = new Map();

      // Sum up all skills from the combination
      combination.forEach(armor => {
          if (armor.skills) {
              armor.skills.forEach(skill => {
                  const current = skillTotals.get(skill.skillName) || 0;
                  skillTotals.set(skill.skillName, current + skill.level);
              });
          }
      });

      // Check if all required skills are met
      for (const [skillName, requiredLevel] of requiredSkills) {
          const actualLevel = skillTotals.get(skillName) || 0;
          if (actualLevel < requiredLevel) {
              return false;
          }
      }

      return true;
  }

  // Recursive function to build combinations
  function buildCombination(current, types) {
      // Stop if we've reached the combination limit
      if (validCombinations.size >= COMBINATION_LIMIT) {
          return;
      }

      if (types.length === 0) {
          if (checkSkillRequirements(current)) {
              const combinationKey = createCombinationKey(current);
              validCombinations.add(combinationKey);
          }
          return;
      }

      const currentType = types[0];
      const remainingTypes = types.slice(1);

      for (const armor of armorByType[currentType]) {
          buildCombination([...current, armor], remainingTypes);
      }
  }

  // Start building combinations
  buildCombination([], ['head', 'chest', 'gloves', 'waist', 'legs']);

  // Convert combination keys back to armor combinations
  const results = Array.from(validCombinations).slice(0, COMBINATION_LIMIT).map(combinationKey => {
      return combinationKey.split('|').map(armorKey => {
          const [name, type] = armorKey.split('_');
          return Object.values(armorByType[type]).find(armor => armor.name === name);
      });
  });

  return results;
}

function displayCombinations(combinations) {
  console.log(`Found ${combinations.length} valid combinations`);
  combinations.forEach((combination, index) => {
      console.log(`\nCombination ${index + 1}:`);
      combination.forEach(armor => {
          console.log(`${armor.type}: ${armor.name}`);
          armor.skills.forEach(skill => {
              console.log(`  - ${skill.skillName} Level ${skill.level}`);
          });
      });
  });
}