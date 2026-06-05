window.onload = function() {
            const loader = document.getElementById('loader');

            // Loading selama persis 2 detik lalu redirect
            setTimeout(() => {
                loader.style.transition = 'opacity 0.5s ease';
                loader.style.opacity = '0';

                // Redirect ke anime.html setelah fade out
                setTimeout(() => {
                    window.location.href = 'anime.html';
                }, 500);
            }, 2000);
        };