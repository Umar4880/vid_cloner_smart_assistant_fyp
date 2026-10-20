document.addEventListener("DOMContentLoaded", () => {
    initializeModalCodeMethodFunctionality(), 
    initializeNavigationLinkActivation(), 
    initializeEditNameFunctionality(), 
    initializeEditEmailFunctionality(), 
    initializeEditPhotoFunctionality(), 
    ShowSettingContent(), 
    initializeToggleSettingContent(), 
    initialize2FAFunctionality(), 
    initializeEditPasswordFunctionality()
  });
  const twoFAenable = !1;
  let activeVerification = null;
  
  function validateImageFile(e) {
    return ["image/jpeg", "image/png"].includes(e.type) ? !(e.size > 5242880) || (alert("File size is too large. Maximum allowed size is 5MB."), !1) : (alert("Only JPG and PNG images are allowed."), !1)
  }
  
  function isValidEmail(e) {
    return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(e)
  }
  
  function enableVerifyBtn(e) {
    6 === e.verificationCodeInput.value.length ? e.submitButton.disabled = !1 : e.submitButton.disabled = !0
  }
  
  function getCookie(e) {
    let t = null;
    if (document.cookie) {
      let i = document.cookie.split(";");
      for (let n of i) {
        let a = n.trim();
        if (a.startsWith(`${e}=`)) {
          t = decodeURIComponent(a.substring(e.length + 1));
          break
        }
      }
    }
    return t
  }
  const toggleEdit = (e, t, i) => {
      i ? (e.style.display = "block", t.style.display = "none") : (e.style.display = "none", t.style.display = "flex")
    },
    showMessage = (e, t) => {
      e.textContent = t, e.style.display = "block", setTimeout(() => {
        e.style.display = "none"
      }, 3e3)
    },
    hideMessages = e => {
      e.successMessage.style.display = "none", e.errorMessage.style.display = "none", e.countdownMessage.style.display = "none", e.verificationResult.style.display = "none"
    },
    startCountdown = (e, t) => {
      let i = t;
      e.countdownMessage.style.display = "block", e.countdownTimer.textContent = i, e.sendCodeBtn.disabled = !0;
      let n = setInterval(() => {
        i -= 1, e.countdownTimer.textContent = i, i <= 0 && (clearInterval(n), e.countdownMessage.style.display = "none", e.sendCodeBtn.disabled = !1)
      }, 1e3);
      return n
    },
    resetModal = (e, t) => {
      e.verificationCodeInput.value = "", e.verificationIcon.style.display = "none", e.emailVerificationModal.classList.remove("animate__fadeOut"), hideMessages(e), clearInterval(t), e.countdownTimer.textContent = "", e.sendCodeBtn.disabled = !1
    },
    sendVerificationCode = async (e, t) => {
      alert("inside code " + e + t);
      try {
        let i = await fetch("/send-verification-code/", {
            method: "POST",
            body: JSON.stringify({
              input: e,
              query: t
            }),
            headers: {
              "Content-Type": "application/json",
              "X-CSRFToken": getCookie("csrftoken")
            }
          }),
          n = await i.json();
        if (n.success) return !0;
        return !1
      } catch (a) {
        return
      }
    }, verifyCode = async (e, t) => {
      try {
        let i = await fetch("/verify-code/", {
            method: "POST",
            body: JSON.stringify({
              code: e,
              input: t
            }),
            headers: {
              "Content-Type": "application/json",
              "X-CSRFToken": getCookie("csrftoken")
            }
          }),
          n = await i.json();
        if (n.success) return !0;
        return !1
      } catch (a) {
        console.error("Error in verifyCode function:", a);
        return
      }
    };
  async function save2Database(e, t) {
    if (!e || !t) return console.error("Invalid arguments passed to save2Database"), {
      success: !1,
      error: "Invalid arguments"
    };
    try {
      let i = await fetch(t, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": getCookie("csrftoken")
        },
        body: JSON.stringify(e)
      });
      if (!i.ok) return console.error(`HTTP Error: ${i.status} and ${i.statusText}`), {
        success: !1,
        error: `HTTP error: ${i.status}`
      };
      let n = await i.json();
      if (n.success) return {
        success: !0,
        data: n
      };
      return console.error("Backend response indicates failure:", n), {
        success: !1,
        error: n.message || "Unknown error from backend"
      }
    } catch (a) {
      return console.error("Error sending data to backend:", a), {
        success: !1,
        error: a.message || "Unknown error"
      }
    }
  }
  async function fetch2Database(e) {
    try {
      let t = await fetch(e, {
        method: "GET",
        headers: {
          "X-CSRFToken": getCookie("csrftoken"),
          "Content-Type": "application/json"
        }
      });
      if (!t.ok) return console.error(`HTTP Error: ${t.status} - ${t.statusText}`), {
        success: !1,
        error: `HTTP error: ${t.status}`
      };
      let i = await t.json();
      if (i.success) return i;
      return console.error("Backend response indicates failure:", i), {
        success: !1,
        error: i.message || "Unknown error from backend"
      }
    } catch (n) {
      return console.error("Error sending data to backend:", n), {
        success: !1,
        error: n.message || "Unknown error"
      }
    }
  }
  async function delete2Database(e, t) {
    try {
      let i = await fetch(e, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": getCookie("csrftoken")
          },
          body: JSON.stringify(t)
        }),
        n = await i.json();
      if (n.success) return alert("2FA data deleted successfully."), n;
      return console.error("Backend response indicates failure:", n), {
        success: !1,
        error: n.message || "Unknown error from backend"
      }
    } catch (a) {
      return console.error("Error sending data to backend:", a), {
        success: !1,
        error: a.message || "Unknown error"
      }
    }
  }
  
  function initializeNavigationLinkActivation() {
    let e = document.querySelectorAll(".nav-link");
    e.forEach(t => {
      t.addEventListener("click", () => {
        e.forEach(e => e.classList.remove("active")), t.classList.add("active")
      })
    })
  }
  
  function initializeToggleSettingContent() {
    let e = document.getElementById("account"),
      t = document.getElementById("security"),
      i = document.getElementById("accountLink"),
      n = document.getElementById("securityLink");
    e.style.display = "block", t.style.display = "none", i.addEventListener("click", () => {
      e.style.display = "block", t.style.display = "none"
    }), n.addEventListener("click", () => {
      e.style.display = "none", t.style.display = "block"
    })
  }
  
  function ShowSettingContent() {
    let e = document.getElementById("accountLink"),
      t = document.getElementById("securityLink");
    [e, t].forEach(e => {
      e.addEventListener("click", function(e) {
        e.preventDefault(), window.innerWidth <= 767 && (document.querySelector(".setting-menu").style.display = "none", document.querySelector(".setting-content").style.display = "block")
      })
    })
  }
  
  function initializeEditPhotoFunctionality() {
    let e = document.getElementById("changePic");
    document.getElementById("removePic");
    let t = document.getElementById("profilePicInput"),
      i = document.getElementById("setting-content-profileAvatar"),
      n = document.getElementById("setting-content-avatarInitials"),
      a = document.getElementById("setting-profileAvatar"),
      s = document.getElementById("setting-menu-avatarInitials"),
      o = document.querySelectorAll(".profile-avatar-img");
    e.addEventListener("click", function() {
      t.click()
    }), t.addEventListener("change", async function(e) {
      let l = e.target.files[0];
      if (l) {
        if (!["image/png", "image/jpeg"].includes(l.type)) {
          alert("Invalid file format. Only PNG and JPEG are supported."), t.value = "";
          return
        }
        if (l.size > 5242880) {
          alert("File size exceeds 5MB. Please choose a smaller file."), t.value = "";
          return
        }
        let r = await uploadProfilePicture(l);
        r && r.image_url ? (profileImage && o.forEach(e => {
          e.src = `${r.image_url}?t=${new Date().getTime()}`
        }), n && (n.style.display = "none"), s && (s.style.display = "none")) : alert("Failed to upload the profile picture. Please try again.")
      } else [i, a].forEach(e => {
        profileImage.src = "none"
      }), [n, s].forEach(e => {
        e.style.display = "block"
      })
    })
  }
  async function uploadProfilePicture(e) {
    let t = new FormData;
    t.append("profile_pic", e);
    try {
      let i = await fetch("/upload-profile-pic/", {
        method: "POST",
        body: t,
        headers: {
          "X-Requested-With": "XMLHttpRequest",
          "X-CSRFToken": getCookie("csrftoken")
        }
      });
      if (!i.ok) throw Error("Network response was not ok " + i.statusText);
      let n = await i.json();
      if (n.success) return console.log("Profile picture uploaded successfully."), n;
      return console.log("Failed to upload profile picture:", n.message), null
    } catch (a) {
      return console.error("Error:", a), null
    }
  }
  
  function initializeEditNameFunctionality() {
    let e = {
      editBtn: document.getElementById("editNameBtn"),
      saveBtn: document.getElementById("saveNameBtn"),
      cancelBtn: document.getElementById("cancelNameBtn"),
      username: document.getElementById("username"),
      editName: document.getElementById("editName"),
      displayName: document.getElementById("displayName"),
      Fname: document.getElementById("contentInputFName"),
      Lname: document.getElementById("contentInputLName"),
      nameError: document.getElementById("nameError")
    };
    e.editName.style.display = "none", e.saveBtn.addEventListener("click", async () => {
      let t = e.Fname.value.trim().replace(" ", "_"),
        i = e.Lname.value.trim().replace(" ", "_"),
        n = /^[A-Za-z\s'-_]+$/;
      if (!n.test(t) || !n.test(i)) {
        showMessage(e.nameError, "Invalid name! Only letters, spaces, apostrophes, and hyphens are allowed.");
        return
      }
      let a = {
        first_name: t,
        last_name: i,
        username: `${t}_${i}`
      };
      try {
        let s = await save2Database(a, "/update-Name/");
        s.success ? (e.username.textContent = `${t}_${i}`, e.Fname.value = t, e.Lname.value = i, toggleEdit(e.editName, e.displayName, !1)) : showMessage(e.nameError, s.error || "Failed to update name.")
      } catch (o) {
        showMessage(e.nameError, "An unexpected error occurred while saving the name."), console.error("Error saving name:", o)
      }
    }), e.cancelBtn.addEventListener("click", () => {
      toggleEdit(e.editName, e.displayName, !1)
    }), e.editBtn.addEventListener("click", () => {
      toggleEdit(e.editName, e.displayName, !0)
    })
  }
  
  function initializeEditEmailFunctionality() {
    let e = {
        editBtn: document.getElementById("editEmailBtn"),
        saveBtn: document.getElementById("saveEmailBtn"),
        cancelBtn: document.getElementById("cancelEmailBtn"),
        emailError: document.getElementById("emailError"),
        editEmail: document.getElementById("editEmail"),
        displayEmail: document.getElementById("displayEmail"),
        email: document.getElementById("userEmail"),
        contentInputEmail: document.getElementById("contentInputEmail"),
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
        verificationIcon: document.getElementById("verificationIcon")
      },
      t;
    e.editEmail.style.display = "none", e.editBtn.addEventListener("click", () => {
      activeVerification = "email"
    }), e.sendCodeBtn.addEventListener("click", async () => {
      if ("email" !== activeVerification) return;
      let i = e.emailVerificationMethod.textContent.trim();
      try {
        let n = await sendVerificationCode(i, "to change email address");
        !0 === n ? (showMessage(e.successMessage, "Verification code sent!"), t = startCountdown(e, 20)) : showMessage(e.errorMessage, "Failed to send verification code.")
      } catch (a) {
        showMessage(e.errorMessage, "Unexpected error while sending the verification code."), console.error("Error in sendVerificationCode:", a)
      }
    }), e.submitButton.addEventListener("click", async () => {
      if ("email" !== activeVerification) return;
      let t = e.verificationCodeInput.value.trim(),
        i = e.emailVerificationMethod.textContent.trim();
      try {
        let n = await verifyCode(t, i);
        hideMessages(e), !0 === n ? (showMessage(e.successMessage, "Verification successful!"), e.verificationIcon.style.display = "block", e.verificationResult.style.display = "block", setTimeout(() => {
          e.emailVerificationModal.classList.add("animate__fadeOut")
        }, 3e3), toggleEdit(e.editEmail, e.displayEmail, !0)) : showMessage(e.errorMessage, "Invalid verification code.")
      } catch (a) {
        showMessage(e.errorMessage, "Unexpected error while verifying the code."), console.error("Error in verifyCode:", a)
      }
    }), e.saveBtn.addEventListener("click", async () => {
      let i = e.contentInputEmail.value.trim();
      if (isValidEmail(i)) {
        activeVerification = null;
        try {
          let n = await save2Database({
            email: i
          }, "/update-email/");
          n.success ? (alert("Email updated successfully!"), e.email.textContent = i, toggleEdit(e.editEmail, e.displayEmail, !1)) : showMessage(e.emailError, n.error)
        } catch (a) {
          showMessage(e.emailError, "An unexpected error occurred while updating the email."), console.error("Error saving email:", a)
        }
        resetModal(e, t)
      } else showMessage(e.emailError, "Invalid email address.")
    }), e.cancelBtn.addEventListener("click", () => {
      activeVerification = null, resetModal(e, t), toggleEdit(e.editEmail, e.displayEmail, !1)
    })
  }
  
  function initialize2FAFunctionality() {
    let e = {
        email: null,
        phone: null,
        twofa_enable: null
      },
      t = {
        sliderToggle: document.getElementById("sliderToggle"),
        emailSection: document.getElementById("email2FASection"),
        phoneSection: document.getElementById("phone2FASection"),
        emailField: document.getElementById("twoFAEmail"),
        setEmail: document.getElementById("setEmail"),
        emailErrorMessage: document.getElementById("EmailErrorMessage"),
        addEmail2FA: document.getElementById("addEmail2FA"),
        setupEmail2FA: document.getElementById("setupEmail2FA"),
        displayEmail2FA: document.getElementById("displayEmail2FA"),
        saveEmail2FA: document.getElementById("saveEmail2FABtn"),
        editEmail2FA: document.getElementById("editEmail2FABtn"),
        deleteEmail2FA: document.getElementById("deleteEmail2FABtn"),
        phoneField: document.getElementById("twoFAPhone"),
        setPhone: document.getElementById("setPhone"),
        phoneErrorMessage: document.getElementById("Phone-error-message"),
        addPhone2FA: document.getElementById("addPhone2FA"),
        setupPhone2FA: document.getElementById("setupPhone2FA"),
        displayPhone2FA: document.getElementById("displayPhone2FA"),
        savePhone2FA: document.getElementById("savePhone2FABtn"),
        editPhone2FA: document.getElementById("editPhone2FABtn"),
        deletePhone2FA: document.getElementById("deletePhone2FABtn"),
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
        verificationIcon: document.getElementById("verificationIcon")
      },
      i = !1;
  
    function n() {
      i ? (t.emailSection.style.display = "block", t.phoneSection.style.display = "block", e.twofa_enable = !0) : (t.emailSection.style.display = "none", t.phoneSection.style.display = "none", e.twofa_enable = !1), e.email ? (t.addEmail2FA.style.display = "none", t.setupEmail2FA.style.display = "none", t.displayEmail2FA.style.display = "flex", t.setEmail.textContent = e.email) : (t.addEmail2FA.style.display = "flex", t.setupEmail2FA.style.display = "none", t.displayEmail2FA.style.display = "none"), e.phone ? (t.addPhone2FA.style.display = "none", t.setupPhone2FA.style.display = "none", t.displayPhone2FA.style.display = "flex", t.setPhone.textContent = e.phone) : (t.addPhone2FA.style.display = "flex", t.setupPhone2FA.style.display = "none", t.displayPhone2FA.style.display = "none"), e.email && e.phone && (t.addEmail2FA.style.display = "none", t.addPhone2FA.style.display = "none")
    }
    async function a(a) {
      let s = await fetch2Database("/get-2FA");
      s.success ? (e.email = s.data.email || null, e.phone = s.data.phone || null, e.twofa_enable = s.data.twofa_enable || !1, i = e.twofa_enable, t.sliderToggle.classList.toggle("active", i), n()) : showMessage(a, s.error)
    }
    async function s(t) {
      if (i) {
        let n = {
          email: e.email,
          phone: e.phone,
          twofa_enable: e.twofa_enable
        };
        alert(n.phone);
        let a = await save2Database(n, "/set-2FA/");
        a.success ? alert("Data saved successfully!") : showMessage(t, a.error)
      }
    }
    async function o(e) {
      if (i) {
        let n = await delete2Database("/delete-2FA/", e);
        n.success ? alert("Data Delete Successfully!") : showMessage(t.emailErrorMessage, n.error)
      }
    }
    t.sliderToggle.addEventListener("click", () => {
      i = !i, t.sliderToggle.classList.toggle("active"), n()
    }), t.sendCodeBtn.addEventListener("click", async () => {
      if ("2FA" !== activeVerification) return;
      let e = t.emailVerificationMethod.textContent.trim();
      try {
        let i = await sendVerificationCode(e, "to delete 2FA Email");
        !0 === i ? (showMessage(t.successMessage, "Verification code sent!"), startCountdown(t, 20)) : showMessage(t.errorMessage, "Failed to send verification code.")
      } catch (n) {
        showMessage(t.errorMessage, "Unexpected error while sending the verification code.")
      }
    }), t.submitButton.addEventListener("click", async () => {
      if ("2FA" !== activeVerification) return;
      let i = t.verificationCodeInput.value.trim(),
        a = t.emailVerificationMethod.textContent.trim();
      try {
        let s = await verifyCode(i, a);
        if (hideMessages(t), !0 === s) {
          showMessage(t.successMessage, "Verification successful!"), t.verificationResult.style.display = "block", isverficationSuccessfull = !0, setTimeout(() => {
            t.emailVerificationModal.classList.add("animate__fadeOut")
          }, 3e3);
          let l = t.emailField.value.trim();
          data = {
            email: l
          }, o(data), n(), resetModal(t, 20), t.emailField.value = null, e.email = null
        } else showMessage(t.errorMessage, "Invalid verification code.")
      } catch {
        showMessage(t.errorMessage, "Unexpected error while verifying the code.")
      }
    }), t.addEmail2FA.addEventListener("click", () => {
      setupEmail2FA.style.display = "block", addEmail2FA.style.display = "none"
    }), t.saveEmail2FA.addEventListener("click", () => {
      if (i) {
        let a = t.emailField.value.trim();
        activeVerification = null, a ? (e.email = a, t.emailErrorMessage.style.display = "none", n(), s()) : t.emailErrorMessage.style.display = "block"
      }
    }), t.editEmail2FA.addEventListener("click", () => {
      i && (t.emailField.value = e.email, e.email = null, t.addEmail2FA.style.display = "none", t.setupEmail2FA.style.display = "block", t.displayEmail2FA.style.display = "none")
    }), t.deleteEmail2FA.addEventListener("click", () => {
      i && (activeVerification = "2FA")
    }), t.addPhone2FA.addEventListener("click", () => {
      t.setupPhone2FA.style.display = "block", t.addPhone2FA.style.display = "none"
    }), t.savePhone2FA.addEventListener("click", () => {
      if (i) {
        let a = t.phoneField.value.trim();
        a.match(/^03\d{9}$/) ? (e.phone = a, t.phoneErrorMessage.style.display = "none", n(), s(t.phoneErrorMessage)) : t.phoneErrorMessage.style.display = "block"
      }
    }), t.editPhone2FA.addEventListener("click", () => {
      i && (t.phoneField.value = e.phone, e.phone = null, t.addPhone2FA.style.display = "none", t.setupPhone2FA.style.display = "block", t.displayPhone2FA.style.display = "none")
    }), t.deletePhone2FA.addEventListener("click", () => {
      let e = t.phoneField.value;
      o(t.phoneErrorMessage, e)
    }), a(t.phoneErrorMessage), n()
  }
  
  function initializeModalCodeMethodFunctionality() {
    let e = document.getElementById("verificationMethod"),
      t = document.getElementById("switchMethod"),
      i = document.getElementById("setEmail"),
      n = document.getElementById("setPhone"),
      a = document.getElementById("userEmail"),
      s = i.textContent,
      o = n.textContent,
      l = a.textContent,
      r = "";
    r = s ? "twofa_email" : o ? "twofa_phone" : "primary_email";
    let d = {
      primary_email: {
        text: l
      },
      twofa_email: {
        text: s
      },
      twofa_phone: {
        text: o
      }
    };
    e.textContent = d[r].text, t.addEventListener("click", () => {
      r = "primary_email" === r && s ? "twofa_email" : "twofa_email" === r && o ? "phone" : "primary_email", e.textContent = d[r].text
    })
  }
  
  function initializeEditPasswordFunctionality() {
    let e = {
        newPassword: document.getElementById("newPassword"),
        confirmPassword: document.getElementById("confirmPassword"),
        passwordError: document.getElementById("passwordError"),
        editPassword: document.getElementById("editPassword"),
        displayPassword: document.getElementById("displayPassword"),
        editPasswordBtn: document.getElementById("editPasswordBtn"),
        cancelPasswordBtn: document.getElementById("cancelPasswordBtn"),
        savePasswordBtn: document.getElementById("savePasswordBtn"),
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
        verificationIcon: document.getElementById("verificationIcon")
      },
      t = !1;
    e.editPassword.style.display = "none";
    let i = /[A-Z]/,
      n = /[a-z]/,
      a = /\d/,
      s = /[@$!%*?&]/,
      o = /.{8,}/;
  
    function l(e, t) {
      let i = document.getElementById(e);
      t ? i.classList.add("met") : i.classList.remove("met")
    }
    e.newPassword.addEventListener("input", function() {
      let r = e.newPassword.value;
      t = i.test(r) && n.test(r) && a.test(r) && s.test(r) && o.test(r), l("uppercase", i.test(r)), l("lowercase", n.test(r)), l("number", a.test(r)), l("special", s.test(r)), l("length", o.test(r))
    }), e.editPasswordBtn.addEventListener("click", () => {
      activeVerification = "password"
    }), e.sendCodeBtn.addEventListener("click", async () => {
      if ("password" !== activeVerification) return;
      let t = e.emailVerificationMethod.textContent.trim();
      try {
        let i = await sendVerificationCode(t, "to change password");
        !0 === i ? (showMessage(e.successMessage, "Verification code sent!"), startCountdown(e, 20)) : showMessage(e.errorMessage, "Failed to send verification code.")
      } catch (n) {
        showMessage(e.errorMessage, "Unexpected error while sending the verification code.")
      }
    }), e.submitButton.addEventListener("click", async () => {
      if ("password" !== activeVerification) return;
      let t = e.verificationCodeInput.value.trim(),
        i = e.emailVerificationMethod.textContent.trim();
      try {
        let n = await verifyCode(t, i);
        hideMessages(e), !0 === n ? (showMessage(e.successMessage, "Verification successful!"), e.verificationResult.style.display = "block", setTimeout(() => {
          e.emailVerificationModal.classList.add("animate__fadeOut")
        }, 3e3), toggleEdit(e.editPassword, e.displayPassword, !0), resetModal(e, 20)) : showMessage(e.errorMessage, "Invalid verification code.")
      } catch {
        showMessage(e.errorMessage, "Unexpected error while verifying the code.")
      }
    }), e.savePasswordBtn.addEventListener("click", async () => {
      activeVerification = null;
      let i = e.newPassword.value.trim(),
        n = e.confirmPassword.value.trim();
      if (alert(i), !t) {
        showMessage(e.passwordError, "Password must fullfil the condition!");
        return
      }
      if (i !== n) {
        showMessage(e.passwordError, "Password and Confirm Password didn't match!");
        return
      }
      try {
        data = {
          password: i,
          confirmPassword: n
        };
        let a = await save2Database(data, "/update-password/");
        a.success ? (alert("Data saved successfully!"), toggleEdit(e.editPassword, e.displayPassword, !1), resetModal(e, 20)) : showMessage(MessageElement, a.error)
      } catch (s) {
        showMessage(e.passwordError, "An unexpected error occurred while updating the password.")
      }
    }), e.cancelPasswordBtn.addEventListener("click", () => {
      activeVerification = null, resetModal(e, 20), toggleEdit(e.editPassword, e.displayPassword, !1)
    })
  }