document.addEventListener("DOMContentLoaded", () => {
    initializeModalCodeMethodFunctionality();
    initializeNavigationLinkActivation();
    initializeEditNameFunctionality();
    initializeEditEmailFunctionality();
    initializeEditPhotoFunctionality();
    ShowSettingContent();
    initializeToggleSettingContent();
    initialize2FAFunctionality();
    initializeEditPasswordFunctionality();
  });
  
  /* -------------------------- Global Variable -------------------------- */
  const twoFAenable = false;
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
    if (elements.verificationCodeInput.value.length === 6) {
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
  const toggleEdit = (element1, element2, isEditing) => {
    if (isEditing) {
      element1.style.display = "block";
      element2.style.display = "none";
    } else {
      element1.style.display = "none";
      element2.style.display = "flex";
    }
  };
  
  // Utility: Show a Message
  const showMessage = (element, message) => {
    element.textContent = message;
    element.style.display = "block";
    setTimeout(() => {
      element.style.display = "none"
    }, 3000);
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
  const sendVerificationCode = async (userInput, query) => {
    alert("inside code " + userInput + query)
    try {
      const response = await fetch("/send-verification-code/", {
        method: "POST",
        body: JSON.stringify({
          input: userInput,
          query
        }),
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
        body: JSON.stringify({
          code: code,
          input: userInput
        }),
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
      return {
        success: false,
        error: "Invalid arguments"
      };
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
        return {
          success: false,
          error: `HTTP error: ${response.status}`
        };
      }
  
      const result = await response.json();
  
      // Assuming the backend sends a 'success' field in JSON
      if (result.success) {
        return {
          success: true,
          data: result
        };
      } else {
        console.error("Backend response indicates failure:", result);
        return {
          success: false,
          error: result.message || "Unknown error from backend"
        };
      }
    } catch (error) {
      // Handle network errors or other unexpected issues
      console.error("Error sending data to backend:", error);
      return {
        success: false,
        error: error.message || "Unknown error"
      };
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
        return {
          success: false,
          error: `HTTP error: ${response.status}`
        };
      }
      const result = await response.json();
  
      if (result.success) {
        return result;
      } else {
        console.error("Backend response indicates failure:", result);
        return {
          success: false,
          error: result.message || "Unknown error from backend"
        };
      }
    } catch (error) {
      console.error("Error sending data to backend:", error);
      return {
        success: false,
        error: error.message || "Unknown error"
      };
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
        return {
          success: false,
          error: result.message || "Unknown error from backend"
        };
      }
    } catch (error) {
      console.error("Error sending data to backend:", error);
      return {
        success: false,
        error: error.message || "Unknown error"
      };
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
    const accountLink = document.getElementById("accountLink");
    const securityLink = document.getElementById("securityLink");
  
    // Initial visibility setup
    accountContent.style.display = "block"; // Show account section by default
    securityContent.style.display = "none"; // Hide security section
  
    // Event listener for "Your Account" link
    accountLink.addEventListener("click", () => {
      accountContent.style.display = "block";
      securityContent.style.display = "none";
    });
  
    // Event listener for "Login & Security" link
    securityLink.addEventListener("click", () => {
      accountContent.style.display = "none";
      securityContent.style.display = "block";
    });
  }
  
  /* ------------Show setting Content When clikc menu link Functionality on small screen------------ */
  function ShowSettingContent() {
    const accountLink = document.getElementById('accountLink');
    const securityLink = document.getElementById('securityLink');
  
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
  function initializeEditPhotoFunctionality() {
    const changePicButton = document.getElementById("changePic");
    const removePicButton = document.getElementById("removePic");
    const profilePicInput = document.getElementById("profilePicInput");
    const settingContentAvatar = document.getElementById("setting-content-profileAvatar");
    const settingContentAvatarInitials = document.getElementById("setting-content-avatarInitials");
    const settingMenuAvatar = document.getElementById("setting-profileAvatar");
    const settingMenuAvatarInitials = document.getElementById("setting-menu-avatarInitials");
    const profileImages = document.querySelectorAll(".profile-avatar-img");
  
    changePicButton.addEventListener("click", function() {
      profilePicInput.click();
    });
  
    profilePicInput.addEventListener("change", async function(event) {
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
        if (uploadedImageUrl && uploadedImageUrl.image_url) {
  
          if (profileImage) {
            // Update the <img> tag's src to the new URL
            profileImages.forEach((img) => {
              img.src = `${uploadedImageUrl.image_url}?t=${new Date().getTime()}`; // Cache-busting
            });
          }
  
          // Hide initials
          if (settingContentAvatarInitials) {
            settingContentAvatarInitials.style.display = "none";
          }
          if (settingMenuAvatarInitials) {
            settingMenuAvatarInitials.style.display = "none";
          }
        } else {
          alert("Failed to upload the profile picture. Please try again.");
        }
      } else {
        // Reset to initials if no image is selected
        [settingContentAvatar, settingMenuAvatar].forEach((avatar) => {
          profileImage.src = "none";
        });
  
        [settingContentAvatarInitials, settingMenuAvatarInitials].forEach((initial) => {
          initial.style.display = "block";
        });
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
  
  
  
/* -------------------------- Edit Name Functionality -------------------------- */
function initializeEditNameFunctionality() {
    const elements = {
        editBtn: document.getElementById("editNameBtn"),
        saveBtn: document.getElementById("saveNameBtn"),
        cancelBtn: document.getElementById("cancelNameBtn"),
        username: document.getElementById("username"),
        editName: document.getElementById("editName"),
        displayName: document.getElementById("displayName"),
        Fname: document.getElementById("contentInputFName"),
        Lname: document.getElementById("contentInputLName"),
        nameError: document.getElementById("nameError"),
    };

    // Hide the edit section initially
    elements.editName.style.display = "none";

    // Save button logic
    elements.saveBtn.addEventListener("click", async () => {
        const newFName = elements.Fname.value.trim().replace(" ", "_");
        const newLName = elements.Lname.value.trim().replace(" ", "_");

        // Validate the input names
        const nameRegex = /^[A-Za-z\s'-_]+$/;
        if (!nameRegex.test(newFName) || !nameRegex.test(newLName)) {
            showMessage(elements.nameError, "Invalid name! Only letters, spaces, apostrophes, and hyphens are allowed.");
            return;
        }

        const data = {
            first_name: newFName,
            last_name: newLName,
            username: `${newFName}_${newLName}`, // Concatenated username format
        };

        try {
            const result = await save2Database(data, "/update-Name/");
            if (!result.success) {
                showMessage(elements.nameError, result.error || "Failed to update name.");
            } else {
                elements.username.textContent = `${newFName}_${newLName}`;
                elements.Fname.value = newFName;
                elements.Lname.value = newLName;
                toggleEdit(elements.editName, elements.displayName, false);
            }
        } catch (error) {
            showMessage(elements.nameError, "An unexpected error occurred while saving the name.");
            console.error("Error saving name:", error);
        }
    });

    // Cancel button logic
    elements.cancelBtn.addEventListener("click", () => {
        toggleEdit(elements.editName, elements.displayName, false);
    });

    // Edit button logic
    elements.editBtn.addEventListener("click", () => {
        toggleEdit(elements.editName, elements.displayName, true);
    });
}

/* -------------------------- Edit Email Functionality -------------------------- */
function initializeEditEmailFunctionality() {
    const elements = {
        // Email DOM Elements
        editBtn: document.getElementById("editEmailBtn"),
        saveBtn: document.getElementById("saveEmailBtn"),
        cancelBtn: document.getElementById("cancelEmailBtn"),
        emailError: document.getElementById("emailError"),
        editEmail: document.getElementById("editEmail"),
        displayEmail: document.getElementById("displayEmail"),
        email: document.getElementById("userEmail"),
        contentInputEmail: document.getElementById("contentInputEmail"),
        // Modal DOM Elements
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
    elements.editEmail.style.display = "none";

    // Edit button logic
    elements.editBtn.addEventListener("click", () => {
        activeVerification = "email";
    });

    // Send verification code logic
    elements.sendCodeBtn.addEventListener("click", async () => {
        if (activeVerification !== "email") return;

        const inputEmail = elements.emailVerificationMethod.textContent.trim();
        try {
            const codeSent = await sendVerificationCode(inputEmail, query);
            if (codeSent === true) {
                showMessage(elements.successMessage, "Verification code sent!");
                countdownInterval = startCountdown(elements, 20);
            } else {
                showMessage(elements.errorMessage, "Failed to send verification code.");
            }
        } catch (error) {
            showMessage(elements.errorMessage, "Unexpected error while sending the verification code.");
            console.error("Error in sendVerificationCode:", error);
        }
    });

    // Verify code logic
    elements.submitButton.addEventListener("click", async () => {
        if (activeVerification !== "email") return;

        const inputCode = elements.verificationCodeInput.value.trim();
        const inputEmail = elements.emailVerificationMethod.textContent.trim();
        try {
            const codeVerify = await verifyCode(inputCode, inputEmail);
            hideMessages(elements);
            if (codeVerify === true) {
                showMessage(elements.successMessage, "Verification successful!");
                elements.verificationIcon.style.display = "block";
                elements.verificationResult.style.display = "block";
                setTimeout(() => {
                    elements.emailVerificationModal.classList.add("animate__fadeOut");
                }, 3000);
                toggleEdit(elements.editEmail, elements.displayEmail, true);
            } else {
                showMessage(elements.errorMessage, "Invalid verification code.");
            }
        } catch (error) {
            showMessage(elements.errorMessage, "Unexpected error while verifying the code.");
            console.error("Error in verifyCode:", error);
        }
    });

    // Save button logic
    elements.saveBtn.addEventListener("click", async () => {
        const newEmail = elements.contentInputEmail.value.trim();
        if (isValidEmail(newEmail)) {
            activeVerification = null;
            const data = { email: newEmail };
            try {
                const result = await save2Database(data, "/update-email/");
                if (!result.success) {
                    showMessage(elements.emailError, result.error);
                } else {
                    alert("Email updated successfully!");
                    elements.email.textContent = newEmail;
                    toggleEdit(elements.editEmail, elements.displayEmail, false);
                }
            } catch (error) {
                showMessage(elements.emailError, "An unexpected error occurred while updating the email.");
                console.error("Error saving email:", error);
            }
            resetModal(elements, countdownInterval);
        } else {
            showMessage(elements.emailError, "Invalid email address.");
        }
    });

    // Cancel button logic
    elements.cancelBtn.addEventListener("click", () => {
        activeVerification = null;
        resetModal(elements, countdownInterval);
        toggleEdit(elements.editEmail, elements.displayEmail, false);
    });
}

  
  function initialize2FAFunctionality() {
    // Simulate user 2FA setup status
    let user2FA = {
      email: null,
      phone: null,
      twofa_enable: null,
    };
  
    let countdownInterval = 20;
  
    const elements = {
      sliderToggle: document.getElementById("sliderToggle"),
      emailSection: document.getElementById("email2FASection"),
      phoneSection: document.getElementById("phone2FASection"),
  
      // DOM Elements for Email
      emailField: document.getElementById("twoFAEmail"),
      setEmail: document.getElementById("setEmail"),
      emailErrorMessage: document.getElementById("EmailErrorMessage"),
  
      addEmail2FA: document.getElementById("addEmail2FA"),
      setupEmail2FA: document.getElementById("setupEmail2FA"),
      displayEmail2FA: document.getElementById("displayEmail2FA"),
  
      saveEmail2FA: document.getElementById("saveEmail2FABtn"),
      editEmail2FA: document.getElementById("editEmail2FABtn"),
      deleteEmail2FA: document.getElementById("deleteEmail2FABtn"),
  
      // DOM Elements for Phone
      phoneField: document.getElementById("twoFAPhone"),
      setPhone: document.getElementById("setPhone"),
      phoneErrorMessage: document.getElementById("Phone-error-message"),
  
      addPhone2FA: document.getElementById("addPhone2FA"),
      setupPhone2FA: document.getElementById("setupPhone2FA"),
      displayPhone2FA: document.getElementById("displayPhone2FA"),
  
      savePhone2FA: document.getElementById("savePhone2FABtn"),
      editPhone2FA: document.getElementById("editPhone2FABtn"),
      deletePhone2FA: document.getElementById("deletePhone2FABtn"),
  
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
        elements.emailSection.style.display = "block";
        elements.phoneSection.style.display = "block";
        user2FA.twofa_enable = true;
      } else {
        elements.emailSection.style.display = "none";
        elements.phoneSection.style.display = "none";
        user2FA.twofa_enable = false;
      }
  
      if (!user2FA.email) {
        elements.addEmail2FA.style.display = "flex";
        elements.setupEmail2FA.style.display = "none";
        elements.displayEmail2FA.style.display = "none";
      } else {
        elements.addEmail2FA.style.display = "none";
        elements.setupEmail2FA.style.display = "none";
        elements.displayEmail2FA.style.display = "flex";
        elements.setEmail.textContent = user2FA.email;
      }
  
      if (!user2FA.phone) {
        elements.addPhone2FA.style.display = "flex";
        elements.setupPhone2FA.style.display = "none";
        elements.displayPhone2FA.style.display = "none";
      } else {
        elements.addPhone2FA.style.display = "none";
        elements.setupPhone2FA.style.display = "none";
        elements.displayPhone2FA.style.display = "flex";
        elements.setPhone.textContent = user2FA.phone;
      }
  
      if (user2FA.email && user2FA.phone) {
        elements.addEmail2FA.style.display = "none";
        elements.addPhone2FA.style.display = "none";
      }
    }
  
    //Function to get 2FA data from the backend
    async function fetch2FACredentials(MessageElement) {
      const result = await fetch2Database('/get-2FA');
      if (!result.success) {
        showMessage(MessageElement, result.error)
      } else {
        user2FA.email = result.data.email || null;
        user2FA.phone = result.data.phone || null;
        user2FA.twofa_enable = result.data.twofa_enable || false; // Set the twofa_enable field
  
        // Activate the slider if twofa_enable is true
        isSliderActive = user2FA.twofa_enable;
        elements.sliderToggle.classList.toggle("active", isSliderActive);
        updateView(); // Update the UI based on the fetched data
      }
    }
  
    // Function to send 2FA data to the backend
    async function save2FACredentials(MessageElement) {
      if (isSliderActive) {
        const data = {
          email: user2FA.email,
          phone: user2FA.phone,
          twofa_enable: user2FA.twofa_enable,
        };
        alert(data.phone)
        const endpoint = '/set-2FA/';
        const result = await save2Database(data, endpoint);
        if (!result.success) {
          showMessage(MessageElement, result.error)
        } else {
          alert("Data saved successfully!")
        }
      }
    }
  
    async function delete2FACredentials(data) {
      if (isSliderActive) {
        const result = await delete2Database('/delete-2FA/', data);
        if (!result.success) {
          showMessage(elements.emailErrorMessage, result.error)
        } else {
          alert("Data Delete Successfully!")
        }
      }
    }
  
    elements.sendCodeBtn.addEventListener("click", async () => {
      if (activeVerification !== "2FA") return; // Only process if password functionality is active
      const query = "to delete 2FA Email";
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
          isverficationSuccessfull = true;
          setTimeout(() => {
            elements.emailVerificationModal.classList.add("animate__fadeOut")
          }, 3000)
          const email = elements.emailField.value.trim();
          data = {
            email: email
          }
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
    elements.addEmail2FA.addEventListener("click", () => {
      setupEmail2FA.style.display = "block";
      addEmail2FA.style.display = "none";
    });
  
    // Save Email
    elements.saveEmail2FA.addEventListener("click", () => {
      if (isSliderActive) {
        const email = elements.emailField.value.trim();
        activeVerification = null;
        if (email) {
          user2FA.email = email;
          elements.emailErrorMessage.style.display = "none";
          updateView();
          save2FACredentials();
        } else {
          elements.emailErrorMessage.style.display = "block";
        }
      }
    });
  
    // Edit Email
    elements.editEmail2FA.addEventListener("click", () => {
      if (isSliderActive) {
        elements.emailField.value = user2FA.email;
        user2FA.email = null;
        elements.addEmail2FA.style.display = "none";
        elements.setupEmail2FA.style.display = "block";
        elements.displayEmail2FA.style.display = "none";
      }
    });
  
    // Delete Email
    elements.deleteEmail2FA.addEventListener("click", () => {
      if (isSliderActive) {
        activeVerification = "2FA";
      }
    });
  
    // Add Phone
    elements.addPhone2FA.addEventListener("click", () => {
      elements.setupPhone2FA.style.display = "block";
      elements.addPhone2FA.style.display = "none";
    });
  
    // Save Phone
    elements.savePhone2FA.addEventListener("click", () => {
      if (isSliderActive) {
        const phone = elements.phoneField.value.trim();
        if (phone.match(/^03\d{9}$/)) {
          user2FA.phone = phone;
          elements.phoneErrorMessage.style.display = "none";
          updateView();
          save2FACredentials(elements.phoneErrorMessage);
        } else {
          elements.phoneErrorMessage.style.display = "block";
        }
      }
    });
  
    // Edit Phone
    elements.editPhone2FA.addEventListener("click", () => {
      if (isSliderActive) {
        elements.phoneField.value = user2FA.phone;
        user2FA.phone = null;
        elements.addPhone2FA.style.display = "none";
        elements.setupPhone2FA.style.display = "block";
        elements.displayPhone2FA.style.display = "none";
      }
    });
  
    // Delete Phone
    elements.deletePhone2FA.addEventListener("click", () => {
      const phone = elements.phoneField.value;
  
      const result = delete2FACredentials(elements.phoneErrorMessage, phone)
    });
  
    // Fetch the 2FA credentials when the page loads
    fetch2FACredentials(elements.phoneErrorMessage);
  
    // Initialize view on load
    updateView();
  }
  
  function initializeModalCodeMethodFunctionality() {
    const verificationMethodSpan = document.getElementById('verificationMethod');
    const switchMethodBtn = document.getElementById("switchMethod")
    const twofa_email = document.getElementById("setEmail");
    const twofa_phone = document.getElementById("setPhone");
    const primary_email = document.getElementById("userEmail");
  
    let twoFAEmail = twofa_email.textContent;
    let twoFAPhone = twofa_phone.textContent;
    let primaryEmail = primary_email.textContent;
    let currentMethod = ""
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
        text: twoFAPhone
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
    let countdownInterval = 20;
    let validPassword = false;
  
    elements.editPassword.style.display = "none";
  
  
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
    elements.newPassword.addEventListener('input', function() {
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
          setTimeout(() => {
            elements.emailVerificationModal.classList.add("animate__fadeOut")
          }, 3000)
          toggleEdit(elements.editPassword, elements.displayPassword, true);
          resetModal(elements, countdownInterval)
        } else {
          showMessage(elements.errorMessage, "Invalid verification code.");
        }
      } catch {
        showMessage(elements.errorMessage, "Unexpected error while verifying the code.");
      }
    });
  
    elements.savePasswordBtn.addEventListener('click', async () => {
      activeVerification = null;
      const password = elements.newPassword.value.trim();
      const confrmpasswrod = elements.confirmPassword.value.trim();
      alert(password)
      if (!validPassword) {
        showMessage(elements.passwordError, "Password must fullfil the condition!");
        return;
      }
      if (password !== confrmpasswrod) {
        showMessage(elements.passwordError, "Password and Confirm Password didn't match!");
        return;
      }
  
      try {
        data = {
          password: password,
          confirmPassword: confrmpasswrod,
        }
        const result = await save2Database(data, '/update-password/')
        if (!result.success) {
          showMessage(MessageElement, result.error)
        } else {
          alert("Data saved successfully!")
          toggleEdit(elements.editPassword, elements.displayPassword, false)
          resetModal(elements, countdownInterval)
        }
      } catch (error) {
        showMessage(elements.passwordError, "An unexpected error occurred while updating the password.");
      }
    });
  
    elements.cancelPasswordBtn.addEventListener("click", () => {
      activeVerification = null; // Reset global state
      resetModal(elements, countdownInterval);
      toggleEdit(elements.editPassword, elements.displayPassword, false);
    });
  }