// AmazonReach - Frontend JavaScript

// Smooth scrolling for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Navbar background on scroll
window.addEventListener('scroll', () => {
    const nav = document.querySelector('.nav');
    if (window.scrollY > 50) {
        nav.style.background = 'rgba(255, 255, 255, 0.95)';
        nav.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
    } else {
        nav.style.background = 'rgba(255, 255, 255, 0.9)';
        nav.style.boxShadow = 'none';
    }
});

// Add animation on scroll (simple version)
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

// Observe all cards
document.querySelectorAll('.feature-card, .pricing-card').forEach(card => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(20px)';
    card.style.transition = 'opacity 0.6s, transform 0.6s';
    observer.observe(card);
});
