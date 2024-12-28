document.addEventListener("DOMContentLoaded", async function () {
  const form = document.getElementById("form")
  const usernameField = form.querySelector("input#username")
  const passwordField = form.querySelector("input#password")

  // Get the stored credentials
  const credential = await navigator.credentials.get({
    password: true,
    mediation: "optional"
  })
  // input the stored credentials and submit the form
  if (credential) {
    usernameField.value = credential.id
    passwordField.value = credential.password
  }

  form.addEventListener("submit", async function(event) {
    event.preventDefault()

    if (!usernameField.value || !passwordField.value) {
      alert("Please fill in both fields.")
      return
    }

    const username = usernameField.value
    console.log("username", username)
    const password = passwordField.value
    console.log("password", password)
    const credential = await navigator.credentials.create({
      password: {
        id: username,
        name: username,
        password: password
      }
    })
    console.log(credential)
    await navigator.credentials.store(credential)
  })
})
