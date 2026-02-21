
// Modal Logic
document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('demo-modal');
    const btn = document.querySelector('a[href="#demo"]'); // Target the Watch Demo button
    const closeBtn = document.getElementsByClassName('close-modal')[0];
    const iframe = document.getElementById('demo-video');
    const iframeSrc = iframe ? iframe.src : '';

    if (btn && modal) {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            modal.style.display = 'block';
            // Slight delay to allow display:block to apply before adding class for opacity transition
            setTimeout(() => {
                modal.classList.add('show');
            }, 10);

            // Auto play disabled to prevent user confusion
        });
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            closeModal();
        });
    }

    // Close on outside click
    window.addEventListener('click', (e) => {
        if (e.target == modal) {
            closeModal();
        }
    });

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.style.display === 'block') {
            closeModal();
        }
    });

    function closeModal() {
        if (!modal) return;
        modal.classList.remove('show');
        setTimeout(() => {
            modal.style.display = 'none';
            // Stop video by resetting src
            if (iframe) {
                iframe.src = iframeSrc;
            }
        }, 300); // 300ms matches css transition
    }
});
