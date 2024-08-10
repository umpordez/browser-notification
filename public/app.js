function registerNotificationServiceWorker () {
    return new Promise((resolve, reject) => {
        if (!('serviceWorker' in navigator)) {
            return resolve();
        }

        return window.navigator.serviceWorker.register(
            `/notification-service-worker.js`,
            { scope: "./" }
        ).then((registration) => {
            const sw = registration.installing ||
                registration.waiting ||
                registration.active;

            if (registration.active) {
                window.notificationServiceWorker = registration;
                resolve();
                return;
            }

            sw.addEventListener('statechange', (ev) => {
                if (ev.target.state === 'activated') {
                    window.notificationServiceWorker = registration;
                    resolve();
                }
            });
        }).catch(reject);
    });
}

async function registerPushManager() {
    try {
        await registerNotificationServiceWorker();
        const result = await window.Notification.requestPermission();

        if (result !== 'granted') {
            alert(`Permission result: ${result}`);
            return;
        }

        const subscription = await window.notificationServiceWorker
            .pushManager
            .subscribe({
                applicationServerKey: window.VAPID_PUBLIC_KEY,
                userVisibleOnly: true
            });

        await fetch('/subscribe', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                browserId: window.BROWSER_ID,
                pushSubscription: subscription
            })
        });

        alert('Subscribed my friend.');
    } catch (ex) {
        alert(`Error when subscribing: ${ex.message}`);
    }
}

registerNotificationServiceWorker().catch(console.error);

document.querySelector('#subscribe').addEventListener('click', () => {
    registerPushManager();
});

document.querySelector('#browserId').innerHTML = window.BROWSER_ID;
document.querySelector('#notifyAll').addEventListener('click', async () => {
    await fetch('/notify-all', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            message: document.querySelector('#message').value
        })
    });

    alert('All done!');
});
