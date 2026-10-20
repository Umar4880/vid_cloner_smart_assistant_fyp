document.addEventListener("DOMContentLoaded", function () {
    // Initialize all functionalities
    fetchUserProfileData()
    ArelableShow();
    initializeSidebarCollapse();
    initializeNavbarDropdown();
    // initializeSidebarDropdown();
    initializeProfilePictureHandling();
    initializeDynamicProfileColor();
    initializeNavigationLinkActivation();
});


function getCookie(name) {
    let cookieValue = null;
    if (document.cookie) {
        const cookies = document.cookie.split(';');
        for (const cookie of cookies) {
            const trimmedCookie = cookie.trim();
            if (trimmedCookie.startsWith(`${name}=`)) {
                cookieValue = decodeURIComponent(trimmedCookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}


function ArelableShow(){
    const profileAvatar = document.getElementById('profileAvatar');
    const username = "rana"; // Fetch dynamically if needed
    profileAvatar.setAttribute('aria-label', username);
}


/* --------------------------
   Sidebar Collapse Management
-------------------------- */
function initializeSidebarCollapse() {
    const sidebar = document.getElementById("sidebarMenu");
    const collapseInstance = bootstrap.Collapse.getOrCreateInstance(sidebar, {
        toggle: false // Explicitly disable automatic toggling
    });
    
    // Check if we're on mobile or desktop
    if (window.innerWidth < 768) {
        // On mobile: hide the sidebar initially
        collapseInstance.hide();
        
        const sidebarElement = sidebar.querySelector('.sidebar');
        if (sidebarElement) {
            sidebarElement.style.transform = 'translateX(-100%)';
        }
    } else {
        // On desktop: show the sidebar
        collapseInstance.show();
        
        const sidebarElement = sidebar.querySelector('.sidebar');
        if (sidebarElement) {
            sidebarElement.style.transform = 'translateX(0)';
            sidebarElement.style.opacity = '1';
        }
    }
    
    // Enhanced animation handling for toggle
    const navbarToggler = document.querySelector('.navbar-toggler');
    if (navbarToggler) {
        navbarToggler.addEventListener('click', function(event) {
            event.preventDefault();
            
            // Get the sidebar element
            const sidebarElement = sidebar.querySelector('.sidebar');
            
            // Toggle with improved animation
            if (sidebar.classList.contains('show')) {
                // When hiding
                if (sidebarElement) {
                    sidebarElement.style.transform = 'translateX(-100%)';
                    sidebarElement.style.opacity = '0';
                    
                    // Small delay before hiding to allow transition to complete
                    setTimeout(() => {
                        collapseInstance.hide();
                    }, 50);
                } else {
                    collapseInstance.hide();
                }
            } else {
                // When showing
                collapseInstance.show();
                
                // Ensure transform and opacity are applied after a slight delay
                if (sidebarElement) {
                    // Small delay to ensure DOM update happens first
                    setTimeout(() => {
                        sidebarElement.style.transform = 'translateX(0)';
                        sidebarElement.style.opacity = '1';
                    }, 50);
                }
            }
        });
    }

    // Close sidebar when clicking outside of it (for mobile only)
    document.addEventListener('click', function(event) {
        // Only apply this logic on mobile screens
        if (window.innerWidth >= 768) return;
        
        const isNavbarToggler = event.target.closest('.navbar-toggler');
        const isSidebar = event.target.closest('.sidebar');
        
        if (!isNavbarToggler && !isSidebar && sidebar.classList.contains('show')) {
            // Add smooth hiding transition
            const sidebarElement = sidebar.querySelector('.sidebar');
            if (sidebarElement) {
                sidebarElement.style.transform = 'translateX(-100%)';
                sidebarElement.style.opacity = '0';
                
                // Small delay before hiding to allow transition to complete
                setTimeout(() => {
                    collapseInstance.hide();
                }, 300);
            } else {
                collapseInstance.hide();
            }
        }
    });
    
    // Handle window resize
    window.addEventListener('resize', function() {
        if (window.innerWidth >= 768) {
            // On desktop: show the sidebar
            collapseInstance.show();
            
            const sidebarElement = sidebar.querySelector('.sidebar');
            if (sidebarElement) {
                sidebarElement.style.transform = 'translateX(0)';
                sidebarElement.style.opacity = '1';
            }
        } else {
            // On mobile: hide the sidebar
            collapseInstance.hide();
            
            const sidebarElement = sidebar.querySelector('.sidebar');
            if (sidebarElement) {
                sidebarElement.style.transform = 'translateX(-100%)';
            }
        }
    });
    
    // Add transition-end handler to clean up styles
    sidebar.addEventListener('hidden.bs.collapse', function () {
        const sidebarElement = sidebar.querySelector('.sidebar');
        if (sidebarElement) {
            sidebarElement.style.transform = 'translateX(-100%)';
            sidebarElement.style.opacity = '0.8';
        }
    });
    
    sidebar.addEventListener('shown.bs.collapse', function () {
        const sidebarElement = sidebar.querySelector('.sidebar');
        if (sidebarElement) {
            sidebarElement.style.transform = 'translateX(0)';
            sidebarElement.style.opacity = '1';
        }
    });
}

/* --------------------------
   Navbar Dropdown Management
-------------------------- */
function initializeNavbarDropdown() {
    const collapseInstance = bootstrap.Collapse.getOrCreateInstance(document.querySelector('#sidebarMenu'));
    const navbarDropdownIcon = document.querySelector('.navbar .profile-section');
    const DropdownMenu = document.querySelector('.profile-dropdown');

    const sidebarDropdownIcon = document.querySelector('.sidebar .profile-section');
    const sidebar = document.getElementById('sidebarMenu');
    //const sidebarDropdownMenu = document.querySelector('.sidebar .profile-dropdown');

    // Handle the navbar profile section click
    if (navbarDropdownIcon && DropdownMenu) {
        navbarDropdownIcon.addEventListener('click', function (e) {
            e.stopPropagation();
            DropdownMenu.classList.toggle('show');
        });
    }

    // Handle the sidebar profile section click
    if (sidebarDropdownIcon && DropdownMenu) {
        sidebarDropdownIcon.addEventListener('click', function (e) {
            e.stopPropagation();
            collapseInstance.hide();
            DropdownMenu.classList.toggle('show');
        });
    }

    document.addEventListener('click', function (event) {
        // Close the navbar dropdown if clicked outside
        if (navbarDropdownIcon && !navbarDropdownIcon.contains(event.target) && !DropdownMenu.contains(event.target)) {
            DropdownMenu.classList.remove('show');
        }

        // Close the sidebar dropdown if clicked outside
        if (sidebarDropdownIcon && !sidebarDropdownIcon.contains(event.target) && !DropdownMenu.contains(event.target)) {
            DropdownMenu.classList.remove('show');
        }
    });

    const dropdownCloseBtn = document.getElementById('dropDownClose');
    dropdownCloseBtn.addEventListener('click', function () {
        DropdownMenu.classList.remove('show');
    });
}

/* --------------------------
   Profile Picture Handling
-------------------------- */

async function fetchUserProfileData() {
    try {
        const response = await fetch("/get-profile-photo/", {
            method: "GET",
            headers: {
                "X-Requested-With": "XMLHttpRequest",
                "X-CSRFToken": getCookie("csrftoken"), // Add CSRF token for security
            },
        });

        const data = await response.json();

        if (data.success) {
            // Set profile image or initials
            const dashboardnavbarProfileimage=document.getElementById("navbarprofileImage");
            const dashboardnavbaravatarinitials=document.getElementById("navbaravatarInitials");
            const dashboardnavbarProfileAvatar= document.getElementById("profileAvatar");

            const dashboardsidebarProfileimage=document.getElementById("sidebarProfileImage");
            const dashboardsidebaravatarinitials=document.getElementById("sidebaravatarInitials");

            const dashboardcardProfileimage=document.getElementById("profileCardImage");
            const dashboardcardavatarinitials=document.getElementById("cardavatarInitials");
            const dashboardcardProfileAvatar= document.getElementById("profileCardAvatar");

            // Profile picture handling
            if (data.profile_picture_url) {
                dashboardsidebarProfileimage.style.display="flex";
                dashboardcardProfileimage.style.display="flex";
                dashboardnavbarProfileimage.style.display="flex";
                dashboardsidebarProfileimage.src = data.profile_picture_url;
                dashboardcardProfileimage.src=data.profile_picture_url;
                dashboardnavbarProfileimage.src=data.profile_picture_url
                
                // Hide initials when there's a profile picture
                dashboardsidebaravatarinitials.style.display = "none";
                dashboardcardavatarinitials.style.display = "none";
                dashboardnavbaravatarinitials.style.display="none"
            } else {
                // Set initials if no profile picture
                dashboardsidebarProfileimage.style.display="none";
                dashboardcardProfileimage.style.display="none";
                dashboardnavbarProfileimage.style.display="none"

                dashboardcardProfileAvatar.style.backgroundColor=data.background_color;
                dashboardcardavatarinitials.style.display = "block";
                dashboardcardavatarinitials.textContent = data.initials;
                dashboardsidebaravatarinitials.style.display = "block";
                dashboardsidebaravatarinitials.textContent = data.initials;
                dashboardnavbaravatarinitials.style.display="block";
                dashboardnavbaravatarinitials.textContent=data.initials;
                dashboardnavbarProfileAvatar.style.backgroundColor=data.background_color;
            }
        } else {
            console.log("Failed to fetch user profile data:", data.message);
        }
    } catch (error) {
        console.error("Error fetching user profile data:", error);
    }
}


async function initializeProfilePictureHandling() {
    const profilePicInput = document.querySelector('#profilePicInput');
    const profileAvatar = document.getElementById('profileAvatar');
    const profileCardAvatar = document.getElementById('profileCardAvatar');
    const navbarInitials = profileAvatar.querySelector('#avatarInitials');
    const cardInitials = profileCardAvatar.querySelector('#avatarInitials');

    profileCardAvatar.addEventListener('click', function () {
        profilePicInput.click();
    });

    profilePicInput.addEventListener('change', async function (event) {
        const file = event.target.files[0];
        if (file) {
            // Check file type and size
            const validFormats = ['image/png', 'image/jpeg'];
            if (!validFormats.includes(file.type)) {
                alert('Invalid file format. Only PNG and JPEG are supported.');
                profilePicInput.value = ''; // Clear the input
                return;
            }

            const maxSize = 5 * 1024 * 1024; // 5 MB in bytes
            if (file.size > maxSize) {
                alert('File size exceeds 5MB. Please choose a smaller file.');
                profilePicInput.value = ''; // Clear the input
                return;
            }

            const reader = new FileReader();
            reader.onload = async function (e) {
                const imageUrl = e.target.result;

                // Upload the image to the server and get the new URL
                const uploadedImageUrl = await uploadProfilePicture(file);
                if (uploadedImageUrl) {
                    fetchUserProfileData();
                } else {
                    alert('Failed to upload the profile picture. Please try again.');
                }
            };
            reader.readAsDataURL(file);
        } else {
            // Reset to initials if no image is selected
            [profileAvatar, profileCardAvatar].forEach(avatar => {
                avatar.style.backgroundImage = 'none';
            });

            [navbarInitials, cardInitials].forEach(initial => {
                initial.style.display = 'block';
            });
        }
    });
}

async function uploadProfilePicture(file) {
    const formData = new FormData();
    formData.append('profile_pic', file);

    try {
        const response = await fetch('/upload-profile-pic/', {
            method: 'POST',
            body: formData,
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
                "X-CSRFToken": getCookie("csrftoken"),
            }
        });

        if (!response.ok) {
            throw new Error('Network response was not ok ' + response.statusText);
        }

        const data = await response.json();
        if (data.success) {
            console.log('Profile picture uploaded successfully.');
            return data; // Return the image URL for use in the callback
        } else {
            console.log('Failed to upload profile picture:', data.message);
            return null; // Return null to indicate failure
        }
    } catch (error) {
        console.log('Error:', error);
        return null; // Return null to indicate an error
    }
}




/* --------------------------
   Dynamic Profile Info
-------------------------- */
function initializeDynamicProfileColor() {
        const navbarpProfilAvatar = document.getElementById('profileAvatar');
        const DropdownAvatar =document.getElementById("profileCardAvatar");
        //const sidebarProfileAvatar=document.getElementById("sidebarAvatar");
        const color = navbarpProfilAvatar.getAttribute('data-color');

        if (navbarpProfilAvatar) {
            navbarpProfilAvatar.style.backgroundColor = color;
            //sidebarProfileAvatar.style.backgroundColor=color;
            DropdownAvatar.style.backgroundColor=color;
        }
}

/* --------------------------
   Navigation Link Activation
-------------------------- */
function initializeNavigationLinkActivation() {
    const navLinks = document.querySelectorAll(".nav-link");

    navLinks.forEach(link => {
        link.addEventListener("click", () => {
            navLinks.forEach(lnk => lnk.classList.remove("active"));
            link.classList.add("active");
        });
    });
}

/* --------------------------
   Random Color Generator
-------------------------- */
function getRandomColor() {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}


//------------------------Time Table show section------------------------//

document.getElementById("")


function dbRenderTimetable(timetable){
    dbRenderDailyView(timetable, todayStr, timetableContent);
}
// Function to render daily view (course boxes for today)
function dbRenderDailyView(timetable, todayStr, container) {
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