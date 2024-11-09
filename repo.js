// Function to fetch all skills and populate dropdown options
function fetchAllSkills() {
  fetch('https://mhw-db.com/skills')
      .then(response => response.json())
      .then(skillsData => {
          // Populate the initial dropdown
          populateSkillDropdown(document.querySelector('.skill-rank-dropdown'), skillsData);
          // Store the skills data to reuse for additional dropdowns
          window.skillsData = skillsData;
      })
      .catch(error => console.error('Error fetching skills data:', error));
}

// Function to populate a given dropdown element with skill ranks
function populateSkillDropdown(dropdown, skillsData) {
  dropdown.innerHTML = ''; // Clear any existing options

  skillsData.forEach(skill => {
      skill.ranks.forEach(rank => {
          const option = document.createElement('option');
          option.text = `${skill.name} - ${rank.level}`; // Display skill name and rank level
          option.value = JSON.stringify(rank); // Store rank object as JSON string in value
          dropdown.appendChild(option);
      });
  });
}

// Function to add a new dropdown
function addNewDropdown() {
  // Create a new dropdown element
  const newDropdown = document.createElement('select');
  newDropdown.classList.add('skill-rank-dropdown'); // Optional class for styling
  populateSkillDropdown(newDropdown, window.skillsData); // Populate with existing skills data

  // Add the new dropdown to the container
  document.getElementById('dropdown-container').appendChild(newDropdown);
}

function storeSkills() {
  const selectedSkills = [];
  // Get all dropdowns with class "skill-rank-dropdown"
  const dropdowns = document.querySelectorAll('.skill-rank-dropdown');

  // Loop through each dropdown and get the selected value
  dropdowns.forEach(dropdown => {
    // Get the selected option's value
    const selectedValue = dropdown.value;

    // Parse the JSON string into an object
    if (selectedValue) {
        try {
            const parsedValue = JSON.parse(selectedValue);
            selectedSkills.push(parsedValue);
        } catch (error) {
            console.error('Failed to parse selected value:', error);
        }
    }

  });
  console.log('Selected skills:', selectedSkills);
  buildingUrl(selectedSkills);
}

function buildingUrl(selectedSkills) {
  let result = {};
  
  // selectedSkills.forEach((skill, index) => {
  //   // Add skillName entry with index
  //   result[`skills[${index}].skillName`] = skill.skillName;
  //   // Add id entry with index
  //   result[`skills[${index}].id`] = skill.id;
  // });
  
  // console.log(result);

  // selectedSkills.forEach(skill => {
  //   // Add entries without indices, matching the API format
  //   result[`skills.skillName`] = skill.skillName;
  //   result[`skills.id`] = skill.id;
  // });

  // const apiUrl = `https://mhw-db.com/armor?q=${JSON.stringify(result)}`;
  // console.log(apiUrl);


  // const skillConditions = selectedSkills.map(skill => ({
  //   "skills.skillName": skill.skillName,
  //   "skills.id": skill.id
  // }));

  // const query = skillConditions
  // console.log(query);
  // console.log(skillConditions);

  const skillConditions = selectedSkills.map(skill => (
    `"skills.skillName":"${skill.skillName}","skills.id":${skill.id}`
  ));
  const query = skillConditions.join(',');
  console.log(query)
  console.log('API URL:', `https://mhw-db.com/armor?q={${query}}`)

  // URL-encode the query string
  // const encodedQueryString = encodeURIComponent(query);

  fetchArmor(query)

  // Fetch the data from the API with the encoded query


function fetchArmor(encodedQueryString){
  fetch(`https://mhw-db.com/armor?q={${encodedQueryString}}`)
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        console.log(data);  // Log the data to check it
        displayArmor(data); // Call the function to display the fetched armor
    })
    .catch(error => console.error('Error fetching data:', error));
  }
}

function displayArmor(data) {
  const resultsDiv = document.getElementById('armor-results');
  resultsDiv.innerHTML = ''; // Clear previous results

  if (data && data.length > 0) {
      data.forEach(armor => {
          const armorDiv = document.createElement('div');
          armorDiv.textContent = `${armor.name} - Defense: ${armor.defense}`;
          resultsDiv.appendChild(armorDiv);
      });
  } else {
      resultsDiv.textContent = 'No armor found for the selected parameters.';
  }
}