document.addEventListener('DOMContentLoaded', function() {
    console.log('Timetable script loaded');
    
    // Check if user has existing preferences and courses (variables passed from template)
    const userHasPreferences = typeof hasPreferences !== 'undefined' ? hasPreferences : false;
    const userHasCourses = typeof hasCourses !== 'undefined' ? hasCourses : false;
    
    // Display the current value of the study hours slider
    const studyHoursSlider = document.getElementById('preferredStudyHours');
    const studyHoursValue = document.getElementById('studyHoursValue');
    
    if (studyHoursSlider && studyHoursValue) {
        studyHoursSlider.addEventListener('input', function() {
            studyHoursValue.textContent = this.value + ' hours';
        });
    }
    
    // Show/hide custom free slots input based on selection
    const studyIntensity = document.getElementById('studyIntensity');
    const customFreeSlotsContainer = document.getElementById('customFreeSlotsContainer');
    
    if (studyIntensity && customFreeSlotsContainer) {
        studyIntensity.addEventListener('change', function() {
            if (this.value === 'custom') {
                customFreeSlotsContainer.style.display = 'block';
            } else {
                customFreeSlotsContainer.style.display = 'none';
            }
        });
    }
    
    // Handle "Edit Study Preferences" button click
    const editPreferencesBtn = document.getElementById('editPreferencesBtn');
    if (editPreferencesBtn) {
        editPreferencesBtn.addEventListener('click', function() {
            // Show preferences form and hide the course setup form
            document.getElementById('studyPreferences').style.display = 'block';
            document.getElementById('step1').style.display = 'none';
            
            // Populate form with existing preferences if available
            if (typeof initialPreferencesData !== 'undefined' && initialPreferencesData) {
                populatePreferencesForm(initialPreferencesData);
            }
            
            // Change the button text to indicate we're editing
            document.getElementById('savePrefBtn').textContent = 'Save Study Preferences';
        });
    }
    
    // Handle "Continue to Course Setup" button click
    const savePrefBtn = document.getElementById('savePrefBtn');
    if (savePrefBtn) {
        savePrefBtn.addEventListener('click', saveStudyPreferences);
    }
    
    // Handle "Add Course" button click
    const addCourseBtn = document.getElementById('addCourseBtn');
    if (addCourseBtn) {
        addCourseBtn.addEventListener('click', addCourse);
    }
    
    // Handle "Generate Timetable" button click
    const generateBtn = document.getElementById('generateBtn');
    if (generateBtn) {
        generateBtn.addEventListener('click', fetchDataAndGenerateTimetable);
    }
    
    // Handle "Edit Study Preferences" button in the timetable view
    const timetableEditPreferencesBtn = document.getElementById('timetableEditPreferencesBtn');
    if (timetableEditPreferencesBtn) {
        timetableEditPreferencesBtn.addEventListener('click', function() {
            // Show the create timetable section again
            document.getElementById('createTimetableSection').style.display = 'block';
            // And hide the generated timetable temporarily
            document.getElementById('generatedTimetableSection').style.display = 'none';
            
            // Show preferences form and hide the course setup form
            document.getElementById('studyPreferences').style.display = 'block';
            document.getElementById('step1').style.display = 'none';
            
            // Populate form with existing preferences if available
            if (typeof initialPreferencesData !== 'undefined' && initialPreferencesData) {
                populatePreferencesForm(initialPreferencesData);
            }
            
            // Change the button text to indicate we're editing
            document.getElementById('savePrefBtn').textContent = 'Save Study Preferences';
        });
    }
    
    // Check if we have initial data from the template to generate timetable
    if (typeof initialCoursesData !== 'undefined' && initialCoursesData && 
        typeof initialPreferencesData !== 'undefined' && initialPreferencesData) {
        console.log('Initial data found, generating timetable...');
        const timetableSection = document.getElementById("createTimetableSection");
        timetableSection.style.display="none"
        generateClientSideTimetable(initialCoursesData, initialPreferencesData);
    }
    
    // Function to save study preferences via AJAX
    function saveStudyPreferences() {
        const csrftoken = getCookie('csrftoken');
        const studyGoal = document.getElementById('studyGoals').value;
        const preferredStudyHours = document.getElementById('preferredStudyHours').value;
        const morningStudy = document.getElementById('morningStudy').checked;
        const afternoonStudy = document.getElementById('afternoonStudy').checked;
        const eveningStudy = document.getElementById('eveningStudy').checked;
        const nightStudy = document.getElementById('nightStudy').checked;
        const breakDuration = document.getElementById('breakDuration').value;
        const breakFrequency = document.getElementById('breakFrequency').value;
        const studyIntensity = document.getElementById('studyIntensity').value;
        const customFreeSlots = document.getElementById('customFreeSlots').value;

        if (!studyGoal || studyGoal === 'Select your primary goal') {
            alert('Please select your study goal');
            return;
        }

        if (!breakDuration || breakDuration === 'Break duration') {
            alert('Please select your preferred break duration');
            return;
        }

        if (!breakFrequency || breakFrequency === 'Break frequency') {
            alert('Please select your preferred break frequency');
            return;
        }

        if (!studyIntensity || studyIntensity === 'How densely do you want your schedule?') {
            alert('Please select your preferred schedule intensity');
            return;
        }

        const data = {
            studyGoal: studyGoal,
            preferredStudyHours: preferredStudyHours,
            morningStudy: morningStudy,
            afternoonStudy: afternoonStudy,
            eveningStudy: eveningStudy,
            nightStudy: nightStudy,
            breakDuration: breakDuration,
            breakFrequency: breakFrequency,
            studyIntensity: studyIntensity,
            customFreeSlots: studyIntensity === 'custom' ? customFreeSlots : null
        };

        savePrefBtn.textContent = 'Saving...';
        savePrefBtn.disabled = true;

        fetch('/save-study-preferences/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrftoken,
            },
            body: JSON.stringify(data)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showNotification('Success', data.message, 'success');
                
                // Check if this is coming from Edit Preferences action in timetable section
                const editFromTimetable = document.getElementById('generatedTimetableSection') && 
                                        document.getElementById('generatedTimetableSection').style.display === 'none';
                
                // Check if user already has courses
                const hasExistingCourses = typeof userHasCourses !== 'undefined' ? userHasCourses : false;
                
                // Always hide preferences form after saving
                document.getElementById('studyPreferences').style.display = 'none';
                
                // IMPORTANT: Always regenerate timetable if user has courses
                if (hasExistingCourses) {
                    // Show the timetable section
                    document.getElementById('createTimetableSection').style.display = 'none';
                    document.getElementById('generatedTimetableSection').style.display = 'block';
                    
                    // Regenerate timetable with new preferences
                    console.log('Regenerating timetable after preference change');
                    fetchDataAndGenerateTimetable();
                } else {
                    // New user with no courses - show course setup
                    document.getElementById('step1').style.display = 'block';
                }
            } else {
                showNotification('Error', data.message, 'error');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showNotification('Error', 'Failed to save preferences. Please try again.', 'error');
        })
        .finally(() => {
            // Update the button text based on context
            if (typeof userHasCourses !== 'undefined' && userHasCourses) {
                savePrefBtn.textContent = 'Save Study Preferences';
            } else {
                savePrefBtn.textContent = 'Continue to Course Setup';
            }
            savePrefBtn.disabled = false;
        });
    }

    // Function to add a course via AJAX
    function addCourse() {
        const csrftoken = getCookie('csrftoken');
        const name = document.getElementById('topicName').value;
        const courseType = document.getElementById('courseType').value;
        const difficulty = document.getElementById('topicDifficulty').value;
        const priority = document.getElementById('coursePriority').value;
        const deadline = document.getElementById('topicDeadline').value;

        if (!name.trim()) {
            alert('Please enter a course name');
            return;
        }

        if (!courseType || courseType === 'Select Course Type') {
            alert('Please select a course type');
            return;
        }

        if (!difficulty || difficulty === 'Select Difficulty') {
            alert('Please select a difficulty level');
            return;
        }

        if (!priority || priority === 'Select Priority') {
            alert('Please select a priority level');
            return;
        }

        if (!deadline) {
            alert('Please select a deadline');
            return;
        }

        const data = {
            name: name,
            courseType: courseType,
            difficulty: difficulty,
            priority: priority,
            deadline: deadline
        };

        addCourseBtn.textContent = 'Adding...';
        addCourseBtn.disabled = true;

        fetch('/add-course/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrftoken,
            },
            body: JSON.stringify(data)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showNotification('Success', data.message, 'success');
                addCourseToList(data.course);
                clearCourseForm();
                
                // Check if we're adding from the timetable view (existing user)
                const isFromTimetableView = document.getElementById('generatedTimetableSection') && 
                                           document.getElementById('generatedTimetableSection').style.display === 'block';
                
                // Only auto-generate if we're adding from the timetable view (existing user)
                if (isFromTimetableView) {
                    console.log("Adding course from timetable view, regenerating timetable...");
                    
                    // Show the timetable section
                    document.getElementById('createTimetableSection').style.display = 'none';
                    document.getElementById('generatedTimetableSection').style.display = 'block';
                    
                    // Regenerate the timetable with the updated course list
                    fetchDataAndGenerateTimetable();
                } else {
                    // For new users, just show a message that the course was added successfully
                    console.log("Course added successfully, not regenerating timetable yet");
                    // Make sure the Generate Timetable button is visible
                    const generateBtn = document.getElementById('generateBtn');
                    if (generateBtn) {
                        generateBtn.style.display = 'block';
                    }
                }
            } else {
                showNotification('Error', data.message, 'error');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showNotification('Error', 'Failed to add course. Please try again.', 'error');
        })
        .finally(() => {
            addCourseBtn.textContent = 'Add Course';
            addCourseBtn.disabled = false;
        });
    }

    // Function to fetch data and generate timetable
    function fetchDataAndGenerateTimetable() {
        const csrftoken = getCookie('csrftoken');
        generateBtn.textContent = 'Generating...';
        generateBtn.disabled = true;

        fetch('/generate-timetable/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrftoken,
            },
            body: JSON.stringify({})
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                console.log('Data received for timetable generation:', data);
                showNotification('Success', data.message, 'success');
                document.getElementById('createTimetableSection').style.display = 'none';
                document.getElementById('generatedTimetableSection').style.display = 'block';
                
                // Generate timetable on client-side using the received data
                generateClientSideTimetable(data.courses, data.preferences, data.today);
            } else {
                showNotification('Error', data.message, 'error');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showNotification('Error', 'Failed to generate timetable. Please try again.', 'error');
        })
        .finally(() => {
            generateBtn.textContent = 'Generate Timetable';
            generateBtn.disabled = false;
        });
    }
    
    // Function to generate timetable on client-side
    function generateClientSideTimetable(courses, preferences, providedToday) {
        document.getElementById('createTimetableSection').style.display = 'none';
        console.log('Generating timetable with courses:', courses);
        console.log('and preferences:', preferences);

        const today = providedToday ? new Date(providedToday) : new Date();
        console.log('Using today as:', today);

        const timetable = {};

        // Create 7 days from today
        for (let i = 0; i < 7; i++) {
            const currentDate = new Date(today);
            currentDate.setDate(currentDate.getDate() + i);
            const dateStr = formatDateToISO(currentDate);
            timetable[dateStr] = [];
        }

        // Study time preferences
        const studyTimes = [];
        if (preferences.morning_study) studyTimes.push('Morning');
        if (preferences.afternoon_study) studyTimes.push('Afternoon');
        if (preferences.evening_study) studyTimes.push('Evening');
        if (preferences.night_study) studyTimes.push('Night');
        if (studyTimes.length === 0) studyTimes.push('Morning', 'Afternoon', 'Evening');

        // Static time slots - removed the 11:00-12:15 slot
        const timeSlotMap = {
            Morning: ['08:00 - 09:15', '09:30 - 10:45', '11:00 - 12:15'],
            Afternoon: ['13:00 - 14:15', '14:30 - 15:45', '16:00 - 17:15'],
            Evening: ['18:00 - 19:15', '19:30 - 20:45', '21:00 - 22:15'],
        };

        // Prepare used slots tracker
        const usedTimeSlots = {};
        for (const date in timetable) {
            usedTimeSlots[date] = new Set();
        }
        
        // Track last used time slot for each course to avoid repetition
        const courseLastTimeSlot = {};

        // Sort courses: priority first, then deadline
        courses.sort((a, b) => {
            if (a.priority !== b.priority) return b.priority - a.priority;
            return new Date(a.deadline) - new Date(b.deadline);
        });

        const sortedDates = Object.keys(timetable).sort();
        
        // Calculate total study sessions needed for each course
        courses.forEach(course => {
            course.sessionsNeeded = 1; // Start with at least one session
            
            // Adjust based on difficulty
            switch (course.difficulty.toLowerCase()) {
                case 'hard': course.sessionsNeeded = 3; break;
                case 'medium': course.sessionsNeeded = 2; break;
                case 'easy': course.sessionsNeeded = 1; break;
            }
            
            // Adjust for high priority courses
            if (course.priority === 'High') {
                course.sessionsNeeded += 1;
            }
            
            console.log(`Course ${course.name} needs ${course.sessionsNeeded} sessions`);
            
            // Initialize last time slot tracking
            courseLastTimeSlot[course.name] = null;
        });
        
        // Calculate required slots per day to distribute evenly
        const totalSessions = courses.reduce((total, course) => total + course.sessionsNeeded, 0);
        const daysCount = sortedDates.length;
        const averageSlotsPerDay = Math.ceil(totalSessions / daysCount);
        
        console.log(`Total sessions: ${totalSessions}, Average per day: ${averageSlotsPerDay}`);
        
        // Track slots already assigned to each day
        const slotsPerDay = {};
        sortedDates.forEach(date => {
            slotsPerDay[date] = 0;
        });
        
        // Function to get available slots for a course, avoiding the last used time slot
        function getAvailableTimeSlotsForCourse(date, courseName, preferredTimes) {
            const availableSlots = [];
            const lastUsedSlot = courseLastTimeSlot[courseName];
            
            for (const timeOfDay of preferredTimes) {
                const slots = timeSlotMap[timeOfDay];
                for (const slot of slots) {
                    if (!usedTimeSlots[date].has(slot) && slot !== lastUsedSlot) {
                        availableSlots.push({
                            timeOfDay: timeOfDay,
                            slot: slot
                        });
                    }
                }
            }
            
            // Shuffle the available slots to increase randomness
            for (let i = availableSlots.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [availableSlots[i], availableSlots[j]] = [availableSlots[j], availableSlots[i]];
            }
            
            return availableSlots;
        }
        
        // First pass: Distribute sessions evenly across all days
        for (const course of courses) {
            let sessionsLeft = course.sessionsNeeded;
            const deadline = new Date(course.deadline);
            
            // First try to assign one session to each day until deadline,
            // prioritizing days with fewer assigned slots
            while (sessionsLeft > 0) {
                // Find all valid days before deadline with the fewest assigned slots
                let availableDates = sortedDates
                    .filter(date => new Date(date) <= deadline && slotsPerDay[date] < averageSlotsPerDay)
                    .sort((a, b) => slotsPerDay[a] - slotsPerDay[b]);
                
                // If no days available under the average, try any day before deadline
                if (availableDates.length === 0) {
                    availableDates = sortedDates
                        .filter(date => new Date(date) <= deadline)
                        .sort((a, b) => slotsPerDay[a] - slotsPerDay[b]);
                }
                
                // If still no days available, break
                if (availableDates.length === 0) {
                    console.warn(`No valid dates available for ${course.name}`);
                    break;
                }
                
                // Try to assign to the day with fewest slots
                const targetDate = availableDates[0];
                let assigned = false;
                
                // Get available slots for this course on this day, avoiding the last used slot
                const availableSlots = getAvailableTimeSlotsForCourse(targetDate, course.name, studyTimes);
                
                if (availableSlots.length > 0) {
                    // Select a slot (first one after shuffling to ensure randomness)
                    const selectedSlot = availableSlots[0];
                    const timeSlot = selectedSlot.slot;
                    
                    // Add this course to the timetable
                    timetable[targetDate].push({
                        id: course.id || Math.random().toString(36).substr(2, 9),
                        topic: course.name,
                        name: course.name,
                        difficulty: course.difficulty,
                        time_slot: timeSlot,
                        allocated_hours: calculateAllocatedHours(timeSlot),
                        deadline: course.deadline,
                        start_time: timeSlot.split(' - ')[0],
                        end_time: timeSlot.split(' - ')[1],
                        priority: course.priority
                    });
                    
                    // Update tracking variables
                    usedTimeSlots[targetDate].add(timeSlot);
                    slotsPerDay[targetDate]++;
                    courseLastTimeSlot[course.name] = timeSlot;
                    sessionsLeft--;
                    assigned = true;
                    console.log(`✅ Assigned "${course.name}" to ${targetDate} at ${timeSlot}`);
                }
                
                // If we couldn't assign to any slot on this day, mark it as filled
                if (!assigned) {
                    slotsPerDay[targetDate] = averageSlotsPerDay + 1; // Mark as "filled beyond average"
                }
                
                // Safety check - if we can't assign anywhere, break to avoid infinite loop
                if (Object.values(slotsPerDay).every(count => count >= averageSlotsPerDay)) {
                    console.warn(`⚠️ Could not assign all sessions for "${course.name}". ${sessionsLeft} sessions unassigned.`);
                    break;
                }
            }
        }
        
        // Second pass: Ensure every day has at least one slot if possible
        for (const date of sortedDates) {
            // Skip days that already have assignments
            if (timetable[date].length > 0) continue;
            
            // Find a course to assign to this empty day
            for (const course of courses) {
                const deadline = new Date(course.deadline);
                // Skip if this date is after deadline
                if (new Date(date) > deadline) continue;
                
                // Get available slots for this course on this day
                const availableSlots = getAvailableTimeSlotsForCourse(date, course.name, studyTimes);
                
                if (availableSlots.length > 0) {
                    // Select a slot
                    const selectedSlot = availableSlots[0];
                    const timeSlot = selectedSlot.slot;
                    
                    // Add this course to the timetable
                    timetable[date].push({
                        id: course.id || Math.random().toString(36).substr(2, 9),
                        topic: course.name,
                        name: course.name,
                        difficulty: course.difficulty,
                        time_slot: timeSlot,
                        allocated_hours: calculateAllocatedHours(timeSlot),
                        deadline: course.deadline,
                        start_time: timeSlot.split(' - ')[0],
                        end_time: timeSlot.split(' - ')[1],
                        priority: course.priority
                    });
                    
                    usedTimeSlots[date].add(timeSlot);
                    slotsPerDay[date]++;
                    courseLastTimeSlot[course.name] = timeSlot;
                    console.log(`✅ Added extra session for "${course.name}" to empty day ${date} at ${timeSlot}`);
                    break;
                }
            }
        }

        console.log('Generated timetable:', JSON.stringify(timetable, null, 2));
        console.log('Slots per day:', JSON.stringify(slotsPerDay, null, 2));
        renderTimetable(timetable);
    }
    
    // Helper: format date to YYYY-MM-DD
    function formatDateToISO(date) {
        return date.toISOString().split('T')[0];
    }

    // Helper: calculate hours between time slots
    function calculateAllocatedHours(timeSlot) {
        const [start, end] = timeSlot.split(' - ');
        const [startHour, startMinute] = start.split(':').map(Number);
        const [endHour, endMinute] = end.split(':').map(Number);
        return ((endHour * 60 + endMinute) - (startHour * 60 + startMinute)) / 60;
    }

    
    // Function to render the timetable on the page
    function renderTimetable(timetable) {
        console.log('Rendering timetable with data:', timetable);
        
        const timetableSection = document.getElementById('generatedTimetableSection');
        if (!timetableSection) {
            console.error('Timetable section not found in the DOM');
            return;
        }
        
        // Create a container for the view toggle and action buttons
        const viewToggleContainer = document.createElement('div');
        viewToggleContainer.className = 'row mb-3';
        viewToggleContainer.innerHTML = `
            <div class="col-12 d-flex justify-content-between align-items-center">
                <!-- Left side - Edit buttons -->
                <div class="d-flex gap-2">
                    <button class="btn btn-outline-primary btn-sm" id="timetableEditPreferencesBtn">
                        <i class="bi bi-sliders"></i> Edit Study Preferences
                    </button>
                    <button class="btn btn-outline-primary btn-sm" id="timetableAddCourseBtn">
                        <i class="bi bi-plus"></i> Add Course
                    </button>
                </div>
                
                <!-- Right side - View toggle buttons -->
                <div class="btn-group" role="group">
                    <button type="button" class="btn btn-outline-primary active" id="dailyViewBtn">Daily View</button>
                    <button type="button" class="btn btn-outline-primary" id="weeklyViewBtn">Full Week View</button>
                </div>
            </div>
        `;
        
        // Check if toggle already exists
        const existingToggle = timetableSection.querySelector('.btn-group');
        if (!existingToggle) {
            // Insert toggle before timetableContent
            const timetableHeader = timetableSection.querySelector('h3') || timetableSection.firstChild;
            timetableSection.insertBefore(viewToggleContainer, timetableHeader.nextSibling);
        }
        
        let timetableContent = document.getElementById('timetableContent');
        if (!timetableContent) {
            console.error('Timetable content container not found in the DOM');
            // Create the timetable content container if it doesn't exist
            const timetableContentDiv = document.createElement('div');
            timetableContentDiv.id = 'timetableContent';
            timetableContentDiv.className = 'row';
            timetableSection.appendChild(timetableContentDiv);
            console.log('Created timetable content container');
            timetableContent = timetableContentDiv;
        }
        
        // Create weekly view container
        let weeklyViewContainer = document.getElementById('weeklyViewContainer');
        if (!weeklyViewContainer) {
            weeklyViewContainer = document.createElement('div');
            weeklyViewContainer.id = 'weeklyViewContainer';
            weeklyViewContainer.className='weekly-view-container d-none'
            timetableSection.appendChild(weeklyViewContainer);
        }
        
        if (!timetable || Object.keys(timetable).length === 0) {
            const alertDiv = document.createElement('div');
            alertDiv.className = 'col-12 alert alert-info text-center';
            alertDiv.textContent = 'No timetable data available. Please generate a timetable.';
            timetableContent.innerHTML = '';
            timetableContent.appendChild(alertDiv);
            weeklyViewContainer.innerHTML = '';
            return;
        }
        
        // Debug: Check what kind of data we have in timetable
        console.log('Timetable data type:', typeof timetable);
        console.log('Timetable keys:', Object.keys(timetable));
        
        const sortedDates = Object.keys(timetable).sort();
        console.log('Dates to display:', sortedDates);
        
        // Get today's date in YYYY-MM-DD format
        const today = new Date();
        const todayStr = formatDateToISO(today);
        
        // Render the daily view (today's schedule by course)
        renderDailyView(timetable, todayStr, timetableContent);
        
        // Render the weekly view (full 7-day schedule in tabular format)
        renderWeeklyView(timetable, sortedDates, weeklyViewContainer);
        
        // Make sure the timetable section is visible
        timetableSection.style.display = 'block';
        
        // Attach event listeners
        attachTimetableEventListeners();
        attachViewToggleListeners(timetableContent, weeklyViewContainer);
        
        // Attach event listeners for timetable action buttons
        const timetableEditPreferencesBtn = document.getElementById('timetableEditPreferencesBtn');
        if (timetableEditPreferencesBtn) {
            timetableEditPreferencesBtn.addEventListener('click', function() {
                // Show the create timetable section again
                document.getElementById('createTimetableSection').style.display = 'block';
                // And hide the generated timetable temporarily
                document.getElementById('generatedTimetableSection').style.display = 'none';
                
                // Show preferences form and hide the course setup form
                document.getElementById('studyPreferences').style.display = 'block';
                document.getElementById('step1').style.display = 'none';
                
                // Populate form with existing preferences if available
                if (typeof initialPreferencesData !== 'undefined' && initialPreferencesData) {
                    populatePreferencesForm(initialPreferencesData);
                }
                
                // Change the button text to indicate we're editing
                document.getElementById('savePrefBtn').textContent = 'Save Study Preferences';
            });
        }
        
        // Add event listener for "Add Course" button in timetable view
        const timetableAddCourseBtn = document.getElementById('timetableAddCourseBtn');
        if (timetableAddCourseBtn) {
            timetableAddCourseBtn.addEventListener('click', function() {
                // Show the create timetable section again
                document.getElementById('createTimetableSection').style.display = 'block';
                // And hide the generated timetable temporarily
                document.getElementById('generatedTimetableSection').style.display = 'none';
                
                // Show course setup form and hide preferences form
                document.getElementById('studyPreferences').style.display = 'none';
                document.getElementById('step1').style.display = 'block';
                
                // Scroll to the add course form to make it visible
                document.getElementById('step1').scrollIntoView({behavior: 'smooth'});
            });
        }
    }
    
    // Function to render daily view (course boxes for today)
    function renderDailyView(timetable, todayStr, container) {
        container.innerHTML = '';
        
        // Handle case where today's date isn't in the timetable
        const todayEntries = timetable[todayStr] || [];
        
        if (todayEntries.length === 0) {
            const alertDiv = document.createElement('div');
            alertDiv.className = 'col-12 alert alert-info text-center';
            alertDiv.textContent = 'No study sessions scheduled for today.';
            container.appendChild(alertDiv);
            return;
        }
        
        // Group entries by course/topic
        const courseGroups = {};
        
        todayEntries.forEach(entry => {
            const topic = entry.topic || entry.name || 'Unnamed Course';
            if (!courseGroups[topic]) {
                courseGroups[topic] = [];
            }
            courseGroups[topic].push(entry);
        });
        
        // Create a card for each course
        Object.keys(courseGroups).forEach(topic => {
            const entries = courseGroups[topic];
            
            const courseCard = document.createElement('div');
            courseCard.className = 'col-lg-6 mb-4';
            
            const cardContent = document.createElement('div');
            cardContent.className = 'tt-card shadow-sm';
            
            const cardHeader = document.createElement('div');
            cardHeader.className = 'tt-card-header timetable-date-header';
            
            cardHeader.innerHTML = `<h5 class="mb-0" style="color:white;">📚 ${topic}</h5>`;
            
            const cardBody = document.createElement('div');
            cardBody.className = 'tt-card-body';
            
            entries.forEach((entry, index) => {
                const entryDiv = document.createElement('div');
                entryDiv.className = `mb-3 p-3 border-bottom ${index === entries.length - 1 ? 'border-bottom-0' : ''}`;
                entryDiv.style.borderRadius = '8px';
                
                const timeSlot = entry.time_slot || `${entry.start_time || '??:??'} - ${entry.end_time || '??:??'}`;
                const difficulty = entry.difficulty || 'Not specified';
                const allocatedHours = entry.allocated_hours || 0;
                const deadline = entry.deadline || 'No deadline';
                
                entryDiv.innerHTML = `
                    <div class="d-flex justify-content-between align-items-start">
                        <div>
                            <h6 class="mb-2 text-primary">⏰ ${timeSlot}</h6>
                            <div class="small">
                                <p class="mb-1">📊 Difficulty: ${difficulty}</p>
                                <p class="mb-1">⏳ Allocated Hours: ${allocatedHours}</p>
                                <p class="mb-0">📅 Deadline: ${formatDate(deadline)}</p>
                            </div>
                        </div>
                        <div>
                            <button class="btn btn-sm btn-outline-primary me-2 edit-slot-btn" 
                                    data-topic="${topic}"
                                    data-start-time="${entry.start_time || ''}"
                                    data-end-time="${entry.end_time || ''}"
                                    data-difficulty="${difficulty}"
                                    data-deadline="${deadline}"
                                    data-id="${entry.id || ''}"
                                    data-bs-toggle="modal" 
                                    data-bs-target="#editModal">
                                ✏️ Edit
                            </button>
                            <button class="btn btn-sm btn-outline-danger delete-slot-btn" 
                                    data-id="${entry.id || ''}">
                                🗑️ Delete
                            </button>
                        </div>
                    </div>
                `;
                
                cardBody.appendChild(entryDiv);
            });
            
            cardContent.appendChild(cardHeader);
            cardContent.appendChild(cardBody);
            courseCard.appendChild(cardContent);
            container.appendChild(courseCard);
        });
        
        // Add date display at the top
        const dateHeader = document.createElement('div');
        dateHeader.className = 'col-12 mb-3';
        dateHeader.innerHTML = `<h4 class="text-center">📆 Today: ${formatDate(todayStr)}</h4>`;
        container.insertBefore(dateHeader, container.firstChild);
    }
    
    // Function to render weekly view (7-day tabular view)
    function renderWeeklyView(timetable, sortedDates, container) {
        container.innerHTML = '';
        
        const table = document.createElement('table');
        table.className = 'table table-bordered table-striped';
        
        // Create table header
        const thead = document.createElement('thead');
        let headerRow = document.createElement('tr');
        headerRow.innerHTML = `
            <th scope="col" class="text-center">Time Slot</th>
        `;
        
        sortedDates.forEach(date => {
            headerRow.innerHTML += `<th scope="col" class="text-center">${formatDate(date)}</th>`;
        });
        
        thead.appendChild(headerRow);
        table.appendChild(thead);
        
        // Create table body
        const tbody = document.createElement('tbody');
        
        // Get all unique time slots from across all days
        const allTimeSlots = new Set();
        sortedDates.forEach(date => {
            const entries = timetable[date] || [];
            entries.forEach(entry => {
                const timeSlot = entry.time_slot || `${entry.start_time || '??:??'} - ${entry.end_time || '??:??'}`;
                allTimeSlots.add(timeSlot);
            });
        });
        
        // Sort time slots
        const sortedTimeSlots = Array.from(allTimeSlots).sort();
        
        // Create a row for each time slot
        sortedTimeSlots.forEach(timeSlot => {
            const row = document.createElement('tr');
            row.innerHTML = `<td class="text-center"><strong>${timeSlot}</strong></td>`;
            
            sortedDates.forEach(date => {
                const entries = timetable[date] || [];
                const matchingEntries = entries.filter(entry => {
                    const entryTimeSlot = entry.time_slot || `${entry.start_time || '??:??'} - ${entry.end_time || '??:??'}`;
                    return entryTimeSlot === timeSlot;
                });
                
                let cellContent = '';
                if (matchingEntries.length > 0) {
                    matchingEntries.forEach(entry => {
                        const topic = entry.topic || entry.name || 'Unnamed Course';
                        const difficulty = entry.difficulty || 'Not specified';
                        const allocatedHours = entry.allocated_hours ? `${entry.allocated_hours} hrs` : '';
                        const deadline = entry.deadline ? `Due: ${formatDate(entry.deadline)}` : '';
                        
                        cellContent += `
                            <div class="mb-2">
                                <strong>${topic}</strong><br>
                                <span class="badge bg-${getDifficultyBadgeClass(difficulty)}">${difficulty}</span>
                                ${allocatedHours ? `<br><span class="text-muted"><i class="fas fa-clock"></i> ${allocatedHours}</span>` : ''}
                                ${deadline ? `<br><span><i class="fas fa-calendar-alt"></i> ${deadline}</span>` : ''}
                            </div>
                        `;
                    });
                } else {
                    cellContent = '-';
                }
                
                row.innerHTML += `<td>${cellContent}</td>`;
            });
            
            tbody.appendChild(row);
        });
        
        table.appendChild(tbody);
        container.appendChild(table);
    }
    
    // Helper function to determine badge color based on difficulty
    function getDifficultyBadgeClass(difficulty) {
        difficulty = difficulty.toLowerCase();
        if (difficulty === 'hard') {
            return 'danger';
        } else if (difficulty === 'medium') {
            return 'warning';
        } else if (difficulty === 'easy') {
            return 'success';
        } else {
            return 'secondary';
        }
    }
    
    // Function to attach view toggle listeners
    function attachViewToggleListeners(dailyContainer, weeklyContainer) {
        const dailyViewBtn = document.getElementById('dailyViewBtn');
        const weeklyViewBtn = document.getElementById('weeklyViewBtn');
        
        if (dailyViewBtn && weeklyViewBtn) {
            dailyViewBtn.addEventListener('click', function() {
                dailyViewBtn.classList.add('active');
                weeklyViewBtn.classList.remove('active');
                
                // Show daily view container
                dailyContainer.classList.remove('d-none');
                dailyContainer.style.display = 'flex';  // Use flex display for proper layout
                
                // Hide weekly view
                weeklyContainer.classList.add('d-none');
            });
            
            weeklyViewBtn.addEventListener('click', function() {
                weeklyViewBtn.classList.add('active');
                dailyViewBtn.classList.remove('active');
                
                

                // Hide daily view container and all tt-cards
                dailyContainer.classList.add('d-none');
                dailyContainer.style.display = 'none';  // Completely hide the container
                
                
                // Show weekly view
                weeklyContainer.classList.remove('d-none');
                weeklyContainer.style.display = 'block';  // Make sure it's visible
                
                // Hide any additional sections that shouldn't be visible in weekly view
            });
        }
    }

    // Function to attach event listeners to timetable elements
    function attachTimetableEventListeners() {
        // Event listeners for edit buttons
        document.querySelectorAll('.edit-slot-btn').forEach(button => {
            button.addEventListener('click', function() {
                const id = this.getAttribute('data-id');
                const topic = this.getAttribute('data-topic');
                const startTime = this.getAttribute('data-start-time');
                const endTime = this.getAttribute('data-end-time');
                const difficulty = this.getAttribute('data-difficulty');
                const deadline = this.getAttribute('data-deadline');
                
                // Populate the edit modal with the slot data
                const editModal = document.getElementById('editModal');
                if (editModal) {
                    const topicInput = editModal.querySelector('#editTopic');
                    const startTimeInput = editModal.querySelector('#editStartTime');
                    const endTimeInput = editModal.querySelector('#editEndTime');
                    const difficultySelect = editModal.querySelector('#editDifficulty');
                    const deadlineInput = editModal.querySelector('#editDeadline');
                    const idInput = editModal.querySelector('#editSlotId');
                    
                    if (topicInput) topicInput.value = topic;
                    if (startTimeInput) startTimeInput.value = startTime;
                    if (endTimeInput) endTimeInput.value = endTime;
                    if (difficultySelect) difficultySelect.value = difficulty;
                    if (deadlineInput) deadlineInput.value = deadline;
                    if (idInput) idInput.value = id;
                }
            });
        });
        
        // Event listeners for delete buttons
        document.querySelectorAll('.delete-slot-btn').forEach(button => {
            button.addEventListener('click', function() {
                const id = this.getAttribute('data-id');
                if (confirm('Are you sure you want to delete this time slot?')) {
                    deleteTimeSlot(id);
                }
            });
        });
    }
    
    // Function to delete a time slot
    function deleteTimeSlot(id) {
        const csrftoken = getCookie('csrftoken');
        
        fetch('/delete-timetable-slot/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrftoken,
            },
            body: JSON.stringify({ id: id })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showNotification('Success', data.message, 'success');
                // Refresh the timetable or remove the deleted item
                fetchDataAndGenerateTimetable();
            } else {
                showNotification('Error', data.message, 'error');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showNotification('Error', 'Failed to delete time slot. Please try again.', 'error');
        });
    }
    
    // Helper function to format dates from YYYY-MM-DD to a more readable format
    function formatDate(dateStr) {
        if (!dateStr) return 'Not specified';
        
        try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) {
                return dateStr; // Return original if not valid date
            }
            
            const options = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' };
            return date.toLocaleDateString(undefined, options);
        } catch (e) {
            console.error('Error formatting date:', e);
            return dateStr;
        }
    }
    
    // Helper function to format current date to ISO format (YYYY-MM-DD)
    function formatDateToISO(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    // Helper functions
    function addCourseToList(course) {
        showNotification('Course Added', `"${course.name}" has been added to your courses.`, 'success');
    }

    function clearCourseForm() {
        document.getElementById('topicName').value = '';
        document.getElementById('courseType').selectedIndex = 0;
        document.getElementById('topicDifficulty').selectedIndex = 0;
        document.getElementById('coursePriority').selectedIndex = 0;
        document.getElementById('topicDeadline').value = '';
    }

    function getCookie(name) {
        let cookieValue = null;
        if (document.cookie && document.cookie !== '') {
            const cookies = document.cookie.split(';');
            for (let i = 0; i < cookies.length; i++) {
                const cookie = cookies[i].trim();
                if (cookie.substring(0, name.length + 1) === (name + '=')) {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                }
            }
        }
        return cookieValue;
    }

    function showNotification(title, message, type) {
        alert(message);
    }

    // Format date helper function (for readable display)
    function formatDate(dateString) {
        if (!dateString) return 'No date';
        
        try {
            // Handle the case where we get a date object directly
            if (dateString instanceof Date) {
                const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
                return dateString.toLocaleDateString(undefined, options);
            }
            
            // For string inputs, ensure proper parsing
            let dateObj;
            if (typeof dateString === 'string') {
                // Check if it's ISO format YYYY-MM-DD
                if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
                    // Parse YYYY-MM-DD format with explicit year, month, day extraction
                    const [year, month, day] = dateString.split('-').map(Number);
                    dateObj = new Date(year, month - 1, day); // month is 0-indexed in JS Date
                } else {
                    // Try other formats
                    dateObj = new Date(dateString);
                }
            } else {
                dateObj = new Date(dateString);
            }
            
            // Check if date is valid
            if (isNaN(dateObj.getTime())) {
                console.error('Invalid date:', dateString);
                return String(dateString); // Return the original string if parsing failed
            }
            
            const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
            return dateObj.toLocaleDateString(undefined, options);
        } catch (e) {
            console.error('Error formatting date:', e, 'for input:', dateString);
            return String(dateString) || 'Date error';
        }
    }
    
    // Function to populate the preferences form with existing data
    function populatePreferencesForm(preferences) {
        console.log('Populating preferences form with:', preferences);
        
        // Set study goal
        const studyGoalsSelect = document.getElementById('studyGoals');
        if (studyGoalsSelect && preferences.study_goal) {
            // Find and select the option with matching value
            for (const option of studyGoalsSelect.options) {
                if (option.value === preferences.study_goal) {
                    option.selected = true;
                    break;
                }
            }
        }
        
        // Set preferred study hours
        const studyHoursSlider = document.getElementById('preferredStudyHours');
        const studyHoursValue = document.getElementById('studyHoursValue');
        if (studyHoursSlider && preferences.preferred_study_hours) {
            studyHoursSlider.value = preferences.preferred_study_hours;
            if (studyHoursValue) {
                studyHoursValue.textContent = preferences.preferred_study_hours + ' hours';
            }
        }
        
        // Set study time checkboxes
        document.getElementById('morningStudy').checked = preferences.morning_study;
        document.getElementById('afternoonStudy').checked = preferences.afternoon_study;
        document.getElementById('eveningStudy').checked = preferences.evening_study;
        document.getElementById('nightStudy').checked = preferences.night_study;
        
        // Set break preferences
        const breakDurationSelect = document.getElementById('breakDuration');
        if (breakDurationSelect && preferences.break_duration) {
            for (const option of breakDurationSelect.options) {
                if (option.value === preferences.break_duration) {
                    option.selected = true;
                    break;
                }
            }
        }
        
        const breakFrequencySelect = document.getElementById('breakFrequency');
        if (breakFrequencySelect && preferences.break_frequency) {
            for (const option of breakFrequencySelect.options) {
                if (option.value === preferences.break_frequency) {
                    option.selected = true;
                    break;
                }
            }
        }
        
        // Set study intensity if available
        const studyIntensity = document.getElementById('studyIntensity');
        const customFreeSlotsContainer = document.getElementById('customFreeSlotsContainer');
        
        if (studyIntensity && preferences.study_intensity) {
            for (const option of studyIntensity.options) {
                if (option.value === preferences.study_intensity) {
                    option.selected = true;
                    break;
                }
            }
            
            // If custom intensity is selected, show and set the custom slots input
            if (preferences.study_intensity === 'custom' && preferences.custom_free_slots && customFreeSlotsContainer) {
                customFreeSlotsContainer.style.display = 'block';
                document.getElementById('customFreeSlots').value = preferences.custom_free_slots;
            }
        }
    }

    // Initialize event listeners
    attachTimetableEventListeners();
});