self.addEventListener("push", async (event) => {
    const { title, body } = await event.data.json();

    self.registration.showNotification(
        title,
        { body, icon: 'https://umpordez.com/assets/images/logo.png' }
    );
});
