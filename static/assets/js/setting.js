document.addEventListener("DOMContentLoaded", () => {
    initializeModalCodeMethodFunctionality();
    initializeNavigationLinkActivation();
    initializeEditNameFunctionality();
    initializeEditEmailFunctionality();
    fetchUserProfileData()
    initializeEditPhotoFunctionality();
    ShowSettingContent();
    initializeToggleSettingContent();
    initialize2FAFunctionality();
    initializeEditPasswordFunctionality();
});

/* -------------------------- Global Variable -------------------------- */
    const twoFAenable=false;
    let activeVerification = null; 


/* -------------------------- Utilities -------------------------- */

// Validate uploaded image file
function validateImageFile(file) {
    const validTypes = ["image/jpeg", "image/png"];
    if (!validTypes.includes(file.type)) {
        alert("Only JPG and PNG images are allowed.");
        return false;
    }
    if (file.size > 5 * 1024 * 1024) { // 5MB limit
        alert("File size is too large. Maximum allowed size is 5MB.");
        return false;
    }
    return true;
}

// Validate email format
function isValidEmail(email) {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
}

// Enable/Disable verify button based on input validation
function enableVerifyBtn(elements) {
    if (elements.verificationCodeInput.value.length === 6 ) {
        elements.submitButton.disabled = false;
    } else {
        elements.submitButton.disabled = true;
    }
}


// Get CSRF token from cookies
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

// Utility: Toggle Edit State
const toggleEdit = (element1,element2, isEditing) => {
    if(isEditing){
        element1.style.display =  "block"; 
        element2.style.display =  "none" ;
    }
    else{
        element1.style.display =  "none"; 
        element2.style.display =  "flex" ;
    }
};

// Utility: Show a Message
const showMessage = (element, message) => {
    element.textContent = message;
    element.style.display = "block";
    setTimeout(()=>{element.style.display="none"}, 3000);
};

// Utility: Hide All Messages
const hideMessages = (elements) => {
    elements.successMessage.style.display = "none";
    elements.errorMessage.style.display = "none";
    elements.countdownMessage.style.display = "none";
    elements.verificationResult.style.display = "none";
};

// Utility: Start Countdown Timer
const startCountdown = (elements, seconds) => {
    let remainingTime = seconds;
    elements.countdownMessage.style.display = "block";
    elements.countdownTimer.textContent = remainingTime;
    elements.sendCodeBtn.disabled = true;

    const countdownInterval = setInterval(() => {
        remainingTime -= 1;
        elements.countdownTimer.textContent = remainingTime;

        if (remainingTime <= 0) {
            clearInterval(countdownInterval);
            elements.countdownMessage.style.display = "none";
            elements.sendCodeBtn.disabled = false;
        }
    }, 1000);

    return countdownInterval;
};

// Utility: Reset Modal State
const resetModal = (elements, countdownInterval) => {
    elements.verificationCodeInput.value = "";
    elements.verificationIcon.style.display = "none";
    elements.emailVerificationModal.classList.remove("animate__fadeOut");
    hideMessages(elements);
    clearInterval(countdownInterval);
    elements.countdownTimer.textContent = "";
    elements.sendCodeBtn.disabled = false;
};

// Utility: Send Verification Code (Reusable for different verifications)
const sendVerificationCode = async (userInput,query) => {
    alert("inside code "+userInput+ query)
    try {
        const response = await fetch("/send-verification-code/", {
            method: "POST",
            body: JSON.stringify({ input: userInput, query }),
            headers: {
                "Content-Type": "application/json",
                "X-CSRFToken": getCookie("csrftoken"),
            },
        });

        const data = await response.json();
        if (data.success) {
            return true;
        } else {
            return false;
        }
    } catch (error) {
        return undefined;
    }
};

// Utility: Verify Code (Reusable for different verifications)
const verifyCode = async (code, userInput) => {
    try {
        const response = await fetch("/verify-code/", {
            method: "POST",
            body: JSON.stringify({ code: code, input: userInput }),
            headers: {
                "Content-Type": "application/json",
                "X-CSRFToken": getCookie("csrftoken"),
            },
        });

        const data = await response.json();
        if (data.success) {
            return true;
        } else {
            return false;
        }
    } catch (error) {
        console.error("Error in verifyCode function:", error);
        return undefined;
    }
};

// Utility: Function to send 2FA data to the backend
async function save2Database(data, endPoint) {
    if (!data || !endPoint) {
        console.error("Invalid arguments passed to save2Database");
        return { success: false, error: "Invalid arguments" };
    }

    try {
        const response = await fetch(endPoint, {
            method: 'POST',
            headers: {
                "Content-Type": "application/json",
                "X-CSRFToken": getCookie("csrftoken"), // Ensure getCookie is defined
            },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            // Handle HTTP errors (e.g., 4xx or 5xx status codes)
            console.error(`HTTP Error: ${response.status} and ${response.statusText}`);
            return { success: false, error: `HTTP error: ${response.status}` };
        }

        const result = await response.json();

        // Assuming the backend sends a 'success' field in JSON
        if (result.success) {
            return { success: true, data: result };
        } else {
            console.error("Backend response indicates failure:", result);
            return { success: false, error: result.message || "Unknown error from backend" };
        }
    } catch (error) {
        // Handle network errors or other unexpected issues
        console.error("Error sending data to backend:", error);
        return { success: false, error: error.message || "Unknown error" };
    }
}

    //Function to get data from the backend
    async function fetch2Database(endPoint) {
        try {
            const response = await fetch(endPoint, {
                method: 'GET',
                headers: {
                    'X-CSRFToken': getCookie("csrftoken"),
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                // Handle HTTP errors (e.g., 4xx or 5xx status codes)
                console.error(`HTTP Error: ${response.status} - ${response.statusText}`);
                return { success: false, error: `HTTP error: ${response.status}` };
            }
            const result = await response.json();

            if (result.success) {
                return result;
            } else {
                console.error("Backend response indicates failure:", result);
                return { success: false, error: result.message || "Unknown error from backend" };
            }
        } catch (error) {
            console.error("Error sending data to backend:", error);
            return { success: false, error: error.message || "Unknown error" };
        }
    }

//Function to delete 2FA credentials from the backend
async function delete2Database(endPoint, data) {
        try {
            const response = await fetch(endPoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCookie("csrftoken"),
                },
                body: JSON.stringify(data),
            });

            const result = await response.json();
            if (result.success) {
                alert('2FA data deleted successfully.');
                return result;
            } else {
                console.error("Backend response indicates failure:", result);
                return { success: false, error: result.message || "Unknown error from backend" };
            }
        } catch (error) {
            console.error("Error sending data to backend:", error);
            return { success: false, error: error.message || "Unknown error" };
        }
}

/* -------------------------- Navigation Link Activation -------------------------- */
function initializeNavigationLinkActivation() {
    const navLinks = document.querySelectorAll(".nav-link");
    navLinks.forEach(link => {
        link.addEventListener("click", () => {
            navLinks.forEach(lnk => lnk.classList.remove("active"));
            link.classList.add("active");
        });
    });
}

/* -------------------------- Toggle Setting Content Functionality -------------------------- */
function initializeToggleSettingContent() {
    const accountContent = document.getElementById("account");
    const securityContent = document.getElementById("security");
    const contactContent = document.getElementById("contact"); // Contact section

    const accountLink = document.getElementById("accountLink");
    const securityLink = document.getElementById("securityLink");
    const contactLink = document.getElementById("contactLink"); // Contact link

    // Initial visibility setup
    accountContent.style.display = "block"; // Show account section by default
    securityContent.style.display = "none"; // Hide security section
    contactContent.style.display = "none"; // Hide contact section

    // Event listener for "Your Account" link
    accountLink.addEventListener("click", () => {
        accountContent.style.display = "block";
        securityContent.style.display = "none";
        contactContent.style.display = "none";
    });

    // Event listener for "Login & Security" link
    securityLink.addEventListener("click", () => {
        accountContent.style.display = "none";
        securityContent.style.display = "block";
        contactContent.style.display = "none";
    });

    // Event listener for "Contact" link
    contactLink.addEventListener("click", () => {
        accountContent.style.display = "none";
        securityContent.style.display = "none";
        contactContent.style.display = "block";
    });
}

/* ------------Show setting Content When clikc menu link Functionality on small screen------------ */
function ShowSettingContent(){
    const accountLink = document.getElementById('accountLink');
    const securityLink =document.getElementById('securityLink');

    [accountLink, securityLink].forEach(link => {
        link.addEventListener('click', function(event) {
            event.preventDefault(); // Prevent default link behavior
    
            if (window.innerWidth <= 767) {
                // Hide the setting menu
                document.querySelector('.setting-menu').style.display = 'none';
    
                // Show the setting content
                document.querySelector('.setting-content').style.display = 'block';
            }
        });
    });
    
}

/* -------------------------- Edit Photo Functionality -------------------------- */
async function fetchUserProfileData() {
    try {
        const response = await fetch("/get-user-profile-data/", {
            method: "GET",
            headers: {
                "X-Requested-With": "XMLHttpRequest",
                "X-CSRFToken": getCookie("csrftoken"), // Add CSRF token for security
            },
        });

        const data = await response.json();

        if (data.success) {
            // Get all profile elements
            const settingMenuprofileImage = document.getElementById("profileImage-menu");
            const settingContentprofileImage = document.getElementById("profileImage-cnt");
            const settingMenuAvatarInitials = document.getElementById("setting-menu-avatarInitials");
            const settingContentAvatarInitials = document.getElementById("setting-content-avatarInitials");
            const settingContentAvatar = document.getElementById("setting-content-profileAvatar");
            const settingMenuAvatar = document.getElementById("setting-menu-profileAvatar");
            
            // Dashboard elements (if they exist)
            const dashboardnavbarProfileimage = document.getElementById("navbarprofileImage");
            const dashboardnavbaravatarinitials = document.getElementById("navbaravatarInitials");
            const dashboardnavbarProfileAvatar = document.getElementById("profileAvatar");

            // Safety check before using elements
            if (data.profile_picture_url) {
                // Set the profile picture URLs where elements exist
                if (settingContentprofileImage) {
                    settingContentprofileImage.style.display = "flex";
                    settingContentprofileImage.src = data.profile_picture_url;
                }
                
                if (settingMenuprofileImage) {
                    settingMenuprofileImage.style.display = "flex";
                    settingMenuprofileImage.src = data.profile_picture_url;
                }
                
                if (dashboardnavbarProfileimage) {
                    dashboardnavbarProfileimage.style.display = "flex";
                    dashboardnavbarProfileimage.src = data.profile_picture_url;
                }
                
                // Hide initials when there's a profile picture
                if (settingMenuAvatarInitials) settingMenuAvatarInitials.style.display = "none";
                if (settingContentAvatarInitials) settingContentAvatarInitials.style.display = "none";
                if (dashboardnavbaravatarinitials) dashboardnavbaravatarinitials.style.display = "none";
            } else {
                // Set initials if no profile picture
                if (settingContentprofileImage) settingContentprofileImage.style.display = "none";
                if (settingMenuprofileImage) settingMenuprofileImage.style.display = "none";
                if (dashboardnavbarProfileimage) dashboardnavbarProfileimage.style.display = "none";

                // Set background color and display initials
                if (settingMenuAvatar) settingMenuAvatar.style.backgroundColor = data.background_color;
                if (settingContentAvatar) settingContentAvatar.style.backgroundColor = data.background_color;
                if (dashboardnavbarProfileAvatar) dashboardnavbarProfileAvatar.style.backgroundColor = data.background_color;
                
                if (settingMenuAvatarInitials) {
                    settingMenuAvatarInitials.style.display = "block";
                    settingMenuAvatarInitials.textContent = data.initials;
                }
                
                if (settingContentAvatarInitials) {
                    settingContentAvatarInitials.style.display = "block";
                    settingContentAvatarInitials.textContent = data.initials;
                }
                
                if (dashboardnavbaravatarinitials) {
                    dashboardnavbaravatarinitials.style.display = "block";
                    dashboardnavbaravatarinitials.textContent = data.initials;
                }
            }
            
            // Set the name and email in the menu if they exist
            const navbarProfileName = document.getElementById("setting-navbarProfileName");
            const navbarProfileEmail = document.getElementById("setting-navbarProfileEmail");
            
            if (navbarProfileName && data.username) navbarProfileName.textContent = data.username;
            if (navbarProfileEmail && data.email) navbarProfileEmail.textContent = data.email;
            
        } else {
            console.log("Failed to fetch user profile data:", data.message);
        }
    } catch (error) {
        console.error("Error fetching user profile data:", error);
    }
}

// JavaScript for uploading profile picture
function initializeEditPhotoFunctionality() {
    const changePicButton = document.getElementById("changePic");
    const removePicButton = document.getElementById("removePic");
    const profilePicInput = document.getElementById("profilePicInput");
    const settingContentAvatarInitials = document.getElementById("setting-content-avatarInitials");
    const settingContentprofileImage = document.getElementById("settingContentprofileImage");
    const settingMenuprofileImage = document.getElementById("settingMenuprofileImage");
    const settingMenuAvatarInitials = document.getElementById("setting-menu-avatarInitials");

    changePicButton.addEventListener("click", function () {
        profilePicInput.click();
    });

    profilePicInput.addEventListener("change", async function (event) {
        const file = event.target.files[0];
        if (file) {
            // Check file type and size
            const validFormats = ["image/png", "image/jpeg"];
            if (!validFormats.includes(file.type)) {
                alert("Invalid file format. Only PNG and JPEG are supported.");
                profilePicInput.value = ""; // Clear the input
                return;
            }

            const maxSize = 5 * 1024 * 1024; // 5 MB in bytes
            if (file.size > maxSize) {
                alert("File size exceeds 5MB. Please choose a smaller file.");
                profilePicInput.value = ""; // Clear the input
                return;
            }

            // Upload the image to the server
            const uploadedImageUrl = await uploadProfilePicture(file);
            if (uploadedImageUrl) {
                alert("done!")
                fetchUserProfileData();

                // // Hide initials
                // if (settingContentAvatarInitials) {
                //     settingContentAvatarInitials.style.display = "none";
                // }
                // if (settingMenuAvatarInitials) {
                //     settingMenuAvatarInitials.style.display = "none";
                // }
            } else {
                alert("Failed to upload the profile picture. Please try again.");
            }            
        } else {
            // Reset to initials if no image is selected
            [settingContentprofileImage, settingMenuprofileImage].forEach((avatar) => {
                avatar.src = "none"; // Set to a default image or blank
            });

            [settingContentAvatarInitials, settingMenuAvatarInitials].forEach((initial) => {
                initial.style.display = "block";
            });
        }
    });

    // Add the remove button functionality
    removePicButton.addEventListener("click", async function () {
        // Send request to the server to remove the image from the database
        const isRemoved = await removeProfilePictureFromServer();

        if (isRemoved) {
            // Reset the profile images to show initials again
            [settingContentprofileImage, settingMenuprofileImage].forEach((avatar) => {
                avatar.src = "none"; // Set to a default image or blank
            });
            fetchUserProfileData();
            if(settingContentAvatarInitials){
                settingContentAvatarInitials.style.display = "block"; 
            }
            if(settingMenuAvatarInitials){
                settingMenuAvatarInitials.style.display = "block";
            }
        } else {
            alert("Failed to remove the profile picture. Please try again.");
        }
    });
}

async function uploadProfilePicture(file) {
    const formData = new FormData();
    formData.append("profile_pic", file);

    try {
        const response = await fetch("/upload-profile-pic/", {
            method: "POST",
            body: formData,
            headers: {
                "X-Requested-With": "XMLHttpRequest",
                "X-CSRFToken": getCookie("csrftoken"),
            },
        });

        if (!response.ok) {
            throw new Error("Network response was not ok " + response.statusText);
        }

        const data = await response.json();
        if (data.success) {
            console.log("Profile picture uploaded successfully.");
            return data; // Return the entire response for handling the URL in the callback
        } else {
            console.log("Failed to upload profile picture:", data.message);
            return null; // Return null to indicate failure
        }
    } catch (error) {
        console.error("Error:", error);
        return null; // Return null to indicate an error
    }
}


// New function to handle profile picture removal
async function removeProfilePictureFromServer() {
    try {
        const response = await fetch("/remove-profile-photo/", {
            method: "POST",
            headers: {
                "X-Requested-With": "XMLHttpRequest",
                "X-CSRFToken": getCookie("csrftoken"),
            },
        });

        if (!response.ok) {
            throw new Error("Network response was not ok " + response.statusText);
        }

        const data = await response.json();
        if (data.success) {
            console.log("Profile picture removed successfully.");
            return true; // Indicate success
        } else {
            console.log("Failed to remove profile picture:", data.message);
            return false; // Indicate failure
        }
    } catch (error) {
        console.error("Error:", error);
        return false; // Indicate error
    }
}


    

/* -------------------------- Edit Name Functionality -------------------------- */
function initializeEditNameFunctionality(){
    const elements={
         editBtn : document.getElementById("editNameBtn"),
         saveBtn : document.getElementById("saveNameBtn"),
         cancelBtn : document.getElementById("cancelNameBtn"),
         username : document.getElementById("username"),
         editName : document.getElementById("editName"),
         displayName : document.getElementById("displayName"),
         Fname:document.getElementById("contentInputFName"),
         Lname:document.getElementById("contentInputLName"),
         nameError:document.getElementById("nameError"),
    }

    // Initially hide the edit section
    elements.editName.style.display = "none";

    elements.saveBtn.addEventListener("click", async () => {
        // Extract new names
        const newFName = elements.Fname.value.trim().replace(" ","_"); 
        const newLName = elements.Lname.value.trim().replace(" ","_"); 
    
        //Validate names
        const nameRegex = /^[A-Za-z\s'-_]+$/;
        if (!nameRegex.test(newFName) || !nameRegex.test(newLName)) {
            showMessage(elements.nameError, "Invalid name! Only letters, spaces, apostrophes, and hyphens are allowed.");
            return;
        }
    
        // Prepare data for submission
        const data = {
            first_name: newFName,
            last_name: newLName,
            username: `${newFName} ${newLName}` // Concatenate full name for username
        };
    
        try {
            // Save to database
            const result = await save2Database(data,'/update-Name/');
    
            if (!result.success) {
                // Show error message if saving fails
                showMessage(elements.nameError, result.error || "Failed to update name.");
            } else {
                // Update UI with new values
                elements.username.textContent = `${newFName}_${newLName}`;
                elements.Fname.value = newFName // Assuming `elements.Fname` is an input
                elements.Lname.value = newLName // Assuming `elements.Lname` is an input
                toggleEdit(elements.editName, elements.displayName, false)// Close the edit mode
            }
        } catch (error) {
            // Handle unexpected errors
            showMessage(elements.nameError, "An unexpected error occurred while saving the name.");
            console.error("Error saving name:", error);
        }
    });
    

    elements.cancelBtn.addEventListener("click", ()=>{
        toggleEdit(elements.editName, elements.displayName, false)
    });

     elements.editBtn.addEventListener("click",()=>{
        toggleEdit(elements.editName,elements.displayName, true)
     });
}

/* -------------------------- Edit Email Functionality -------------------------- */
function initializeEditEmailFunctionality() {
    const elements = {
        //Email DOM
        editBtn: document.getElementById("editEmailBtn"),
        saveBtn: document.getElementById("saveEmailBtn"),
        cancelBtn: document.getElementById("cancelEmailBtn"),
        emailError: document.getElementById("emailError"),
        editEmail: document.getElementById("editEmail"),
        displayEmail: document.getElementById("displayEmail"),
        email: document.getElementById("userEmail"),
        contentInputEmail: document.getElementById("contentInputEmail"),
        //Modal DOM
        verificationCodeInput: document.getElementById("verificationCode"),
        emailVerificationModal: document.getElementById("emailVerificationModal"),
        emailVerificationMethod: document.getElementById("verificationMethod"),
        submitButton: document.getElementById("submitCodeBtn"),
        errorMessage: document.getElementById("error-message"),
        successMessage: document.getElementById("success-message"),
        sendCodeBtn: document.getElementById("sendCodeBtn"),
        countdownMessage: document.getElementById("countdownMessage"),
        countdownTimer: document.getElementById("countdownTimer"),
        verificationResult: document.getElementById("verificationResult"),
        verificationIcon: document.getElementById("verificationIcon"),
    };

    const query = "to change email address";
    let countdownInterval;
    elements.editEmail.style.display="none";

    // Reset modal state when "Edit" is clicked
    elements.editBtn.addEventListener("click", () => {
        activeVerification = "email"; // Set the global state
    });

    // Send verification code
    elements.sendCodeBtn.addEventListener("click", async () => {
        if (activeVerification !== "email") return; // Only process if email functionality is active

        const inputEmail = elements.emailVerificationMethod.textContent.trim();
        try {
            const codeSent = await sendVerificationCode(inputEmail, query);
            if (codeSent === true) {
                showMessage(elements.successMessage, "Verification code sent!");
                startCountdown(elements, 20);
            } else {
                showMessage(elements.errorMessage, "Failed to send verification code.");
            }
        } catch (error) {
            showMessage(elements.errorMessage, "Unexpected error while sending the verification code.");
        }
    });

    // Verify the entered code
    elements.submitButton.addEventListener("click", async () => {
        if (activeVerification !== "email") return; // Only process if email functionality is active

        const inputCode = elements.verificationCodeInput.value.trim();
        const inputEmail = elements.emailVerificationMethod.textContent.trim();

        try {
            const codeVerify = await verifyCode(inputCode, inputEmail);
            hideMessages(elements);
            if (codeVerify === true) {
                showMessage(elements.successMessage, "Verification successful!");
                elements.verificationIcon.style.display = "block";
                elements.verificationResult.style.display = "block";
                setTimeout(()=>{elements.emailVerificationModal.classList.add("animate__fadeOut")},3000)
                toggleEdit(elements.editEmail, elements.displayEmail, true);
            } else {
                showMessage(elements.errorMessage, "Invalid verification code.");
            }
        } catch {
            showMessage(elements.errorMessage, "Unexpected error while verifying the code.");
        }
    });

    // Save the new email
    elements.saveBtn.addEventListener("click", async () => {
        const newEmail = elements.contentInputEmail.value.trim();
        if (isValidEmail(newEmail)) {
            elements.email.textContent = newEmail;
            activeVerification = null; // Reset global state
            const data={email:newEmail};
            try{
                const result =await save2Database(data,'/update-email/');
                if(!result.success){
                    showMessage(elements.emailError, result.error)
                }
                else{
                    alert("Email Update successfully")
                    toggleEdit(elements.editEmail, elements.displayEmail, false);
                }
            }
            catch(error){
                showMessage(elements.nameError, "An unexpected error occurred while updating the email.");
                console.error("Error saving email:", error);
            }
            resetModal(elements, countdownInterval);
        } else {
            showMessage(elements.emailError, "Invalid email address.");
        }
    });

    // Cancel the edit
    elements.cancelBtn.addEventListener("click", () => {
        activeVerification = null; // Reset global state
        resetModal(elements, countdownInterval);
        toggleEdit(elements.editEmail, elements.displayEmail, false);
    });
}

function initialize2FAFunctionality() {
    // Simulate user 2FA setup status
    let user2FA = {
        email: null,
        phone: null,
        twofa_enable: false,
    };

    let countdownInterval=20;
    let isverficationSuccessfull=false;

    const elements={
     sliderToggle : document.getElementById("sliderToggle"),
     emailSection:document.getElementById("email2FASection"),
     phoneSection : document.getElementById("phone2FASection"),

    // DOM Elements for Email
     emailField : document.getElementById("twoFAEmail"),
     setEmail : document.getElementById("setEmail"),
     emailErrorMessage : document.getElementById("EmailErrorMessage"),

     addEmail2FA : document.getElementById("addEmail2FA"),
     setupEmail2FA : document.getElementById("setupEmail2FA"),
     displayEmail2FA : document.getElementById("displayEmail2FA"),

     saveEmail2FA : document.getElementById("saveEmail2FABtn"),
     editEmail2FA : document.getElementById("editEmail2FABtn"),
     deleteEmail2FA : document.getElementById("deleteEmail2FABtn"),

    // DOM Elements for Phone
     phoneField : document.getElementById("twoFAPhone"),
     setPhone : document.getElementById("setPhone"),
     phoneErrorMessage : document.getElementById("Phone-error-message"),

     addPhone2FA : document.getElementById("addPhone2FA"),
     setupPhone2FA : document.getElementById("setupPhone2FA"),
     displayPhone2FA : document.getElementById("displayPhone2FA"),

     savePhone2FA : document.getElementById("savePhone2FABtn"),
     editPhone2FA : document.getElementById("editPhone2FABtn"),
     deletePhone2FA : document.getElementById("deletePhone2FABtn"),

      //Modal DOM
      verificationCodeInput: document.getElementById("verificationCode"),
      emailVerificationModal: document.getElementById("emailVerificationModal"),
      emailVerificationMethod: document.getElementById("verificationMethod"),
      submitButton: document.getElementById("submitCodeBtn"),
      errorMessage: document.getElementById("error-message"),
      successMessage: document.getElementById("success-message"),
      sendCodeBtn: document.getElementById("sendCodeBtn"),
      countdownMessage: document.getElementById("countdownMessage"),
      countdownTimer: document.getElementById("countdownTimer"),
      verificationResult: document.getElementById("verificationResult"),
      verificationIcon: document.getElementById("verificationIcon"),
    };
    // Check if the slider is active
    let isSliderActive = false;

    // Toggle the slider state
    elements.sliderToggle.addEventListener("click", () => {
        isSliderActive = !isSliderActive;
        elements.sliderToggle.classList.toggle("active");
        updateView();
    });

    // Update visibility and interaction based on current state
    function updateView() {
        if (isSliderActive) {
            if (elements.emailSection) elements.emailSection.style.display = "block";
            if (elements.phoneSection) elements.phoneSection.style.display = "block";
            user2FA.twofa_enable=true;
        } else {
            if (elements.emailSection) elements.emailSection.style.display = "none";
            if (elements.phoneSection) elements.phoneSection.style.display = "none";
            user2FA.twofa_enable=false;
        }

        if (!user2FA.email) {
            if (elements.addEmail2FA) elements.addEmail2FA.style.display = "flex";
            if (elements.setupEmail2FA) elements.setupEmail2FA.style.display = "none";
            if (elements.displayEmail2FA) elements.displayEmail2FA.style.display = "none";
        } else {
            if (elements.addEmail2FA) elements.addEmail2FA.style.display = "none";
            if (elements.setupEmail2FA) elements.setupEmail2FA.style.display = "none";
            if (elements.displayEmail2FA) {
                elements.displayEmail2FA.style.display = "flex";
                if (elements.setEmail) elements.setEmail.textContent = user2FA.email;
            }
        }

        if (!user2FA.phone) {
            if (elements.addPhone2FA) elements.addPhone2FA.style.display = "flex";
            if (elements.setupPhone2FA) elements.setupPhone2FA.style.display = "none";
            if (elements.displayPhone2FA) elements.displayPhone2FA.style.display = "none";
        } else {
            if (elements.addPhone2FA) elements.addPhone2FA.style.display = "none";
            if (elements.setupPhone2FA) elements.setupPhone2FA.style.display = "none";
            if (elements.displayPhone2FA) {
                elements.displayPhone2FA.style.display = "flex";
                if (elements.setPhone) elements.setPhone.textContent = user2FA.phone;
            }
        }

        if (user2FA.email && user2FA.phone) {
            if (elements.addEmail2FA) elements.addEmail2FA.style.display = "none";
            if (elements.addPhone2FA) elements.addPhone2FA.style.display = "none";
        }
    }

    //Function to get 2FA data from the backend
    async function fetch2FACredentials(MessageElement) {
        try {
            const result = await fetch2Database('/get-2FA/');
            if (result.success) {
                user2FA.email = result.data.email || null;
                user2FA.phone = result.data.phone || null;
                user2FA.twofa_enable = result.data.twofa_enable || false;  // Set the twofa_enable field

                // Activate the slider if twofa_enable is true
                isSliderActive = user2FA.twofa_enable;
                if (elements.sliderToggle) {
                    elements.sliderToggle.classList.toggle("active", isSliderActive);
                }
                updateView(); // Update the UI based on the fetched data
            } else {
                // If the request returns a failure (e.g., 404 error), initialize with default values
                console.log("No 2FA settings found, initializing with defaults");
                user2FA.email = null;
                user2FA.phone = null;
                user2FA.twofa_enable = false;
                isSliderActive = false;
                if (elements.sliderToggle) {
                    elements.sliderToggle.classList.remove("active");
                }
                updateView();
            }
        } catch (error) {
            console.error("Error fetching 2FA credentials:", error);
            // Handle any errors during fetch by initializing with default values
            user2FA.email = null;
            user2FA.phone = null;
            user2FA.twofa_enable = false;
            isSliderActive = false;
            if (elements.sliderToggle) {
                elements.sliderToggle.classList.remove("active");
            }
            updateView();
        }
    }

    // Function to send 2FA data to the backend
    async function save2FACredentials(MessageElement){
    if(isSliderActive){
        const data = {
            email: user2FA.email,
            phone: user2FA.phone,
            twofa_enable: user2FA.twofa_enable,
        };
        alert(data.phone)
        const endpoint='/set-2FA/';
        const result = await save2Database(data, endpoint);
        if(!result.success){
            showMessage(MessageElement, result.error)
        }
        else{
            alert("Data saved successfully!")
        }
    }}

    async function delete2FACredentials(data) {
        if(isSliderActive){
        const result=await delete2Database('/delete-2FA/', data);
        if(!result.success){
            showMessage(elements.emailErrorMessage, result.error)
        }
        else{
            alert("Data Delete Successfully!")
        }}
    }

    elements.sendCodeBtn.addEventListener("click", async () => {
        if (activeVerification !== "2FA") return; // Only process if password functionality is active
        const query="to delete 2FA Email";
        const inputEmail = elements.emailVerificationMethod.textContent.trim();
        try {
            const codeSent = await sendVerificationCode(inputEmail, query);
            if (codeSent === true) {
                showMessage(elements.successMessage, "Verification code sent!");
                startCountdown(elements, 20);
            } else {
                showMessage(elements.errorMessage, "Failed to send verification code.");
            }
        } catch (error) {
            showMessage(elements.errorMessage, "Unexpected error while sending the verification code.");
        }
    });


    elements.submitButton.addEventListener("click", async () => {
        if (activeVerification !== "2FA") return; // Only process if password functionality is active

        const inputCode = elements.verificationCodeInput.value.trim();
        const inputEmail = elements.emailVerificationMethod.textContent.trim();

        try {
            const codeVerify = await verifyCode(inputCode, inputEmail);
            hideMessages(elements);
            if (codeVerify === true) {
                showMessage(elements.successMessage, "Verification successful!");
                elements.verificationResult.style.display = "block";
                isverficationSuccessfull=true;
                setTimeout(()=>{elements.emailVerificationModal.classList.add("animate__fadeOut")},3000)
                const email=elements.emailField.value.trim();
                data={email:email}
                delete2FACredentials(data);
                updateView();
                resetModal(elements, countdownInterval)
                elements.emailField.value = null;
                user2FA.email = null;
            } else {
                showMessage(elements.errorMessage, "Invalid verification code.");
            }
        } catch {
            showMessage(elements.errorMessage, "Unexpected error while verifying the code.");
        }
    });

    // Add Email
    if (elements.addEmail2FA) {
        elements.addEmail2FA.addEventListener("click", () => {
            if (elements.setupEmail2FA) elements.setupEmail2FA.style.display = "block";
            if (elements.addEmail2FA) elements.addEmail2FA.style.display = "none";
        });
    }

    // Save Email
    if (elements.saveEmail2FA) {
        elements.saveEmail2FA.addEventListener("click", () => {
            if (isSliderActive && elements.emailField) {
                const email = elements.emailField.value.trim();
                activeVerification = null;
                if (email) {
                    user2FA.email = email;
                    if (elements.emailErrorMessage) elements.emailErrorMessage.style.display = "none";
                    updateView();
                    save2FACredentials();
                } else {
                    if (elements.emailErrorMessage) elements.emailErrorMessage.style.display = "block";
                }
            }
        });
    }

    // Edit Email
    if (elements.editEmail2FA) {
        elements.editEmail2FA.addEventListener("click", () => {
            if (isSliderActive) {
                if (elements.emailField) elements.emailField.value = user2FA.email;
                user2FA.email = null;
                if (elements.addEmail2FA) elements.addEmail2FA.style.display = "none";
                if (elements.setupEmail2FA) elements.setupEmail2FA.style.display = "block";
                if (elements.displayEmail2FA) elements.displayEmail2FA.style.display = "none";
            }
        });
    }

    // Delete Email
    if (elements.deleteEmail2FA) {
        elements.deleteEmail2FA.addEventListener("click", () => {
            if (isSliderActive) {
                activeVerification = "2FA"; 
            }
        });
    }

    // Add Phone
    if (elements.addPhone2FA) {
        elements.addPhone2FA.addEventListener("click", () => {
            if (elements.setupPhone2FA) elements.setupPhone2FA.style.display = "block";
            if (elements.addPhone2FA) elements.addPhone2FA.style.display = "none";
        });
    }

    // Save Phone
    if (elements.savePhone2FA) {
        elements.savePhone2FA.addEventListener("click", () => {
            if (isSliderActive && elements.phoneField) {
                const phone = elements.phoneField.value.trim();
                if (phone.match(/^03\d{9}$/)) {
                    user2FA.phone = phone;
                    if (elements.phoneErrorMessage) elements.phoneErrorMessage.style.display = "none";
                    updateView();
                    save2FACredentials(elements.phoneErrorMessage);
                } else {
                    if (elements.phoneErrorMessage) elements.phoneErrorMessage.style.display = "block";
                }
            }
        });
    }

    // Edit Phone
    if (elements.editPhone2FA) {
        elements.editPhone2FA.addEventListener("click", () => {
            if (isSliderActive) {
                if (elements.phoneField) elements.phoneField.value = user2FA.phone;
                user2FA.phone = null;
                if (elements.addPhone2FA) elements.addPhone2FA.style.display = "none";
                if (elements.setupPhone2FA) elements.setupPhone2FA.style.display = "block";
                if (elements.displayPhone2FA) elements.displayPhone2FA.style.display = "none";
            }
        });
    }

    // Delete Phone
    if (elements.deletePhone2FA) {
        elements.deletePhone2FA.addEventListener("click", () => {
            const phone = elements.phoneField ? elements.phoneField.value : '';
            const result = delete2FACredentials(elements.phoneErrorMessage, phone);
        });
    }

    // Fetch the 2FA credentials when the page loads
    fetch2FACredentials(elements.phoneErrorMessage);

    // Initialize view on load
    updateView();
}


function initializeModalCodeMethodFunctionality(){
    const verificationMethodSpan = document.getElementById('verificationMethod');
    const switchMethodBtn =document.getElementById("switchMethod")
    const twofa_email=document.getElementById("setEmail");
    const twofa_phone =document.getElementById("setPhone");
    const primary_email=document.getElementById("userEmail");

    let twoFAEmail=twofa_email.textContent;
    let twoFAPhone=twofa_phone.textContent;
    let primaryEmail=primary_email.textContent;
    let currentMethod=""
    if (twoFAEmail) {
        currentMethod = "twofa_email";
    } else if (twoFAPhone) {
        currentMethod = "twofa_phone";
    } else {
        currentMethod = "primary_email";
    }    

    // Methods and corresponding text
    const methods = {
        primary_email: {
            text: primaryEmail
        },
        twofa_email: {
            text: twoFAEmail
        },
        twofa_phone: {
            text:twoFAPhone
        }
    };
    verificationMethodSpan.textContent = methods[currentMethod].text;
    // Handle switching between methods
    switchMethodBtn.addEventListener('click', () => {
        if (currentMethod === 'primary_email' && twoFAEmail) {
            currentMethod = 'twofa_email';
        } else if (currentMethod === 'twofa_email' && twoFAPhone) {
            currentMethod = 'phone';
        } else {
            currentMethod = 'primary_email';
        }

        // Update the modal content
        verificationMethodSpan.textContent = methods[currentMethod].text;
    });
}

function initializeEditPasswordFunctionality() {
    const elements = {
        //Password DOM
        newPassword: document.getElementById("newPassword"),
        confirmPassword: document.getElementById("confirmPassword"),
        passwordError: document.getElementById("passwordError"),
        editPassword: document.getElementById("editPassword"),
        displayPassword: document.getElementById("displayPassword"),
        editPasswordBtn: document.getElementById("editPasswordBtn"),
        cancelPasswordBtn: document.getElementById("cancelPasswordBtn"),
        savePasswordBtn: document.getElementById("savePasswordBtn"),
        //Modal DOM
        verificationCodeInput: document.getElementById("verificationCode"),
        emailVerificationModal: document.getElementById("emailVerificationModal"),
        emailVerificationMethod: document.getElementById("verificationMethod"),
        submitButton: document.getElementById("submitCodeBtn"),
        errorMessage: document.getElementById("error-message"),
        successMessage: document.getElementById("success-message"),
        sendCodeBtn: document.getElementById("sendCodeBtn"),
        countdownMessage: document.getElementById("countdownMessage"),
        countdownTimer: document.getElementById("countdownTimer"),
        verificationResult: document.getElementById("verificationResult"),
        verificationIcon: document.getElementById("verificationIcon"),
    };

    const query = "to change password";
    let countdownInterval=20;
    let validPassword = false;

    elements.editPassword.style.display="none";

        
    // Regular expressions for each password criteria
    const uppercaseRegex = /[A-Z]/;
    const lowercaseRegex = /[a-z]/;
    const numberRegex = /\d/;
    const specialCharRegex = /[@$!%*?&]/;
    const lengthRegex = /.{8,}/;

    function toggleCriteria(id, isValid) {
        const element = document.getElementById(id);
        if (isValid) {
            element.classList.add('met');
        } else {
            element.classList.remove('met');
        }
    }
    // Listen for input changes in the password field
    elements.newPassword.addEventListener('input', function () {
        const password = elements.newPassword.value;

        // Check each password criteria
        validPassword = 
            uppercaseRegex.test(password) &&
            lowercaseRegex.test(password) &&
            numberRegex.test(password) &&
            specialCharRegex.test(password) &&
            lengthRegex.test(password);

        // Update criteria visualization
        toggleCriteria('uppercase', uppercaseRegex.test(password));
        toggleCriteria('lowercase', lowercaseRegex.test(password));
        toggleCriteria('number', numberRegex.test(password));
        toggleCriteria('special', specialCharRegex.test(password));
        toggleCriteria('length', lengthRegex.test(password));
    });

    elements.editPasswordBtn.addEventListener("click", () => {
        activeVerification = "password"; 
    });

    elements.sendCodeBtn.addEventListener("click", async () => {
        if (activeVerification !== "password") return; // Only process if password functionality is active

        const inputEmail = elements.emailVerificationMethod.textContent.trim();
        try {
            const codeSent = await sendVerificationCode(inputEmail, query);
            if (codeSent === true) {
                showMessage(elements.successMessage, "Verification code sent!");
                startCountdown(elements, 20);
            } else {
                showMessage(elements.errorMessage, "Failed to send verification code.");
            }
        } catch (error) {
            showMessage(elements.errorMessage, "Unexpected error while sending the verification code.");
        }
    });

    elements.submitButton.addEventListener("click", async () => {
        if (activeVerification !== "password") return; // Only process if password functionality is active

        const inputCode = elements.verificationCodeInput.value.trim();
        const inputEmail = elements.emailVerificationMethod.textContent.trim();

        try {
            const codeVerify = await verifyCode(inputCode, inputEmail);
            hideMessages(elements);
            if (codeVerify === true) {
                showMessage(elements.successMessage, "Verification successful!");
                elements.verificationResult.style.display = "block";
                setTimeout(()=>{elements.emailVerificationModal.classList.add("animate__fadeOut")},3000)
                toggleEdit(elements.editPassword, elements.displayPassword, true);
                resetModal(elements, countdownInterval)
            } else {
                showMessage(elements.errorMessage, "Invalid verification code.");
            }
        } catch {
            showMessage(elements.errorMessage, "Unexpected error while verifying the code.");
        }
    });

    elements.savePasswordBtn.addEventListener('click',async ()=>{
        activeVerification= null;
        const password=elements.newPassword.value.trim();
        const confrmpasswrod=elements.confirmPassword.value.trim();
        alert(password)
        if(!validPassword){
            showMessage(elements.passwordError,"Password must fullfil the condition!");
            return;
        }
        if(password!==confrmpasswrod){
            showMessage(elements.passwordError,"Password and Confirm Password didn't match!");
            return;
        }

        try{
            data={password: password,
                  confirmPassword: confrmpasswrod,}
            const result=await save2Database(data,'/update-password/')
            if(!result.success){
                showMessage(MessageElement, result.error)
            }
            else{
                alert("Data saved successfully!")
                toggleEdit(elements.editPassword, elements.displayPassword, false)
                resetModal(elements, countdownInterval)
            }
        }
        catch(error){
            showMessage(elements.passwordError, "An unexpected error occurred while updating the password.");
        }
    });

    elements.cancelPasswordBtn.addEventListener("click", () => {
        activeVerification = null; // Reset global state
        resetModal(elements, countdownInterval);
        toggleEdit(elements.editPassword, elements.displayPassword, false);
    });
}

