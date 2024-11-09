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

// Function to create a unique ID for each dropdown
function createUniqueId() {
  return 'dropdown-' + Math.random().toString(36).substr(2, 9);
}

// Function to populate a given dropdown element with skill ranks
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
                  skillName: skill.name
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

// Function to add a new dropdown
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
  const fetchDatas = []; // Array to collect promises

  dropdowns.forEach(dropdown => {
    const selectedValue = dropdown.value;

    if (selectedValue) {
      try {
        const parsedValue = JSON.parse(selectedValue);
        const fetchData = formatedParams(parsedValue) // Fetch data for each dropdown value
          .then(response => {
            console.log('Response from fetch:', response);
            return response; // Return response to be collected in storedData
          });
          fetchDatas.push(fetchData); // Store promise
      } catch (error) {
        console.error('Failed to parse selected value:', error);
      }
    }
  });
  displayArmor(fetchDatas);
}

// Build parameter with MongoDB Style as per MHWDB documentation
function formatedParams(selectedSkills) {
  const query = `{"skills.skillName":"${selectedSkills.skillName}"}`; // ,"skills.id":"${selectedSkills.id}"
  console.log(query);
  const encodedQueryString = encodeURIComponent(query);
  console.log(encodedQueryString);
  console.log('API URL:', `https://mhw-db.com/armor?q={${query}}`);

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

// Display store data.
function displayArmor(fetchPromises) {
  const resultsDiv = document.getElementById('armor-results');
  resultsDiv.innerHTML = ''; // Clear previous results
  
  Promise.all(fetchPromises)
    .then(responses => {
      if (responses && responses.length > 0) {
        responses.forEach(dataArray => {
          // Ensure dataArray is iterable if API response returns an array
          dataArray.forEach(armor => {
            const armorDiv = document.createElement('div');
            armorDiv.textContent = `${armor.name} - Defense: ${armor.defense}`;
            resultsDiv.appendChild(armorDiv);
          });
        });
      } else {
        resultsDiv.textContent = 'No armor found for the selected parameters.';
      }
    })
    .catch(error => console.error('Error in fetching armor data:', error));
}