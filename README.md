# MMHWI-SSS (Monster Hunter World Iceborne - Skill Set Search)

### First of all the features
- Search function by adding Armor skills
- Exclude function for different parameters. e.g Armor piece, Master/High/Low etc.
- Use built in deco or upload your own deco function
- Saving an armor set
### Specs
- Going to be a static website (HTML, Tailwind CLI, JS)
- We are going to consume this https://mhw-db.com/
- If possible I want offline version. Basically I'll get the data we need in the API then just turn it into JSON
- Desktop first then Mobile. I want it usable for my sake
- If possible if I manage to finish this lets use this as a base for MH Wilds
### Problems so far
- Bro I am not a coding genius this is a big algo
## Progress
- Added fetchAllSkills fetch for skills
- Added Dropdown and used the fetchAllSkills function to show as options
- Added Clone button for the Dropdown
- Added gatherData, buildingUrl and fetchArmor to fetch list of armor base on Skill and its level (Need to tune)
- Added button to trigger gatherData
- Added Choice.js for search function within dropdown
- Added Display for all the armors result
- Ehhh
## Diary
### Day 1
- Brainstorm how to approach it
- Option 1 (What I am trying to do right now 11/08/2021)
  - Get all skills within dropdown
  - Fetch each armor with that parameters (skills, Master, etc.)
  - Store it then we start to figure out the math for this sht (the hardest part)
  - Display it to first 20 base on user pref, Def asc/desc, E Def asc/def, Slots remaining, etc.
- Option 2 (It took me a day to figure out Option 1 so nothing yet)
### Day 2
- Added JS for fetch all skills
- Store in Dropdown
- Added clone no jutsu for dropdown
- Get frustrated
- Quit
### Day 3
- Tried to fetch skill base on dropdown value
- Can display but realized that it fetches armor base on everyskill
- Added a centralize function to display in console each skills and what armors that have that skills
- Added choice.js for search function within dropdown
- Try to deploy this just in case.
- Oh my god JS has asynchronous syntanx. Unlike rails which stop the threads or the block of code as long as its not finished JS async acuatlly just go and go then you need to do a Promise.all then pass the promise then once its done I can do the next step. Very informative and I realize its very different from rails
- I can show now all armors that has skills selected.
- Good stopping point for tommorows attempt to create an algorithm.
### Day 4
- I'll stop for now I realize this is too heavy for me but right now its working it just too long to load
- Adding "rank":"low/high/master" will make it faster const query = `{"skills.skillName":"${selectedSkills.skillName}"}`;
- It only search for 5 piece not including the charm and slots/decorations
- I shall return