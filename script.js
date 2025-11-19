// Optimized Navigation Scroll Effect (using requestAnimationFrame)
let navScrollTicking = false;
function updateNavbar() {
    const navbar = document.getElementById('navbar');
    if (navbar) {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    }
    navScrollTicking = false;
}

window.addEventListener('scroll', function() {
    if (!navScrollTicking) {
        window.requestAnimationFrame(updateNavbar);
        navScrollTicking = true;
    }
}, { passive: true });

// Mobile Menu Toggle
const hamburger = document.getElementById('hamburger');
const navMenu = document.getElementById('navMenu');

if (hamburger && navMenu) {
    hamburger.addEventListener('click', function() {
        hamburger.classList.toggle('active');
        navMenu.classList.toggle('active');
        const isExpanded = hamburger.classList.contains('active');
        hamburger.setAttribute('aria-expanded', isExpanded);
    });
}

// Close mobile menu when clicking on a link
const navLinks = document.querySelectorAll('.nav-link');
navLinks.forEach(link => {
    link.addEventListener('click', function() {
        hamburger.classList.remove('active');
        navMenu.classList.remove('active');
    });
});

// Active Navigation Link
const sections = document.querySelectorAll('section[id]');
const navLinksAll = document.querySelectorAll('.nav-link');

function activeLink() {
    let current = '';
    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.clientHeight;
        if (window.scrollY >= sectionTop - 200) {
            current = section.getAttribute('id');
        }
    });

    navLinksAll.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === `#${current}`) {
            link.classList.add('active');
        }
    });
}

// Optimized scroll handler with requestAnimationFrame
let scrollTicking = false;
function handleScroll() {
    activeLink();
    scrollTicking = false;
}

window.addEventListener('scroll', function() {
    if (!scrollTicking) {
        window.requestAnimationFrame(handleScroll);
        scrollTicking = true;
    }
}, { passive: true });

// Welcome Modal
const welcomeModal = document.getElementById('welcomeModal');
const closeModal = document.querySelector('.close-modal');

// Check if user has visited before
function hasVisitedBefore() {
    try {
        return localStorage.getItem('hasVisited') === 'true';
    } catch (e) {
        return false;
    }
}

function setVisited() {
    try {
        localStorage.setItem('hasVisited', 'true');
    } catch (e) {
        // localStorage not available
    }
}

// Show modal on first visit - Defer to avoid blocking LCP
if (welcomeModal && !hasVisitedBefore()) {
    if ('requestIdleCallback' in window) {
        requestIdleCallback(function() {
            setTimeout(() => {
                if (welcomeModal) {
                    welcomeModal.classList.add('show');
                    setVisited();
                }
            }, 2000);
        }, { timeout: 3000 });
    } else {
        setTimeout(() => {
            if (welcomeModal) {
                welcomeModal.classList.add('show');
                setVisited();
            }
        }, 2000);
    }
}

// Close modal
if (closeModal && welcomeModal) {
    closeModal.addEventListener('click', function() {
        if (welcomeModal) {
            welcomeModal.classList.remove('show');
            // Show expert modal after welcome modal closes (if enough time has passed)
            setTimeout(() => {
                if (typeof showExpertModal === 'function') {
                    showExpertModal();
                }
            }, 2000);
        }
    });

    // Close modal when clicking outside
    welcomeModal.addEventListener('click', function(event) {
        if (event.target === welcomeModal) {
            welcomeModal.classList.remove('show');
            // Show expert modal after welcome modal closes (if enough time has passed)
            setTimeout(() => {
                if (typeof showExpertModal === 'function') {
                    showExpertModal();
                }
            }, 2000);
        }
    });
}

// Expert Dentist Consultation Modal - Smart Helpful System
const expertConsultationModal = document.getElementById('expertConsultationModal');
const expertCloseBtn = document.querySelector('.expert-close-btn');

// Configuration
const EXPERT_CONFIG = {
    MODAL_KEY: 'expertModalLastShown',
    CLOSED_KEY: 'expertModalClosed',
    INTEREST_KEY: 'expertModalInterest',
    SERVICES_SCROLL_KEY: 'expertModalServicesScrolled',
    INTERVAL: 3 * 60 * 1000, // Show every 3 minutes if conditions met (reduced from 5 to appear faster)
    MIN_TIME_AFTER_CLOSE: 1.5 * 60 * 1000, // Wait 1.5 minutes after closing before showing again (reduced from 2)
    SERVICES_SCROLL_THRESHOLD: 2, // Number of times user scrolls through services (reduced from 3)
    CONFUSION_TIME: 30 * 1000, // Time spent on page without action (30 seconds, reduced from 45)
    MIN_SCROLL_DEPTH: 30, // Minimum scroll percentage to show interest (reduced from 40)
    INITIAL_DELAY: 15 * 1000 // 15 seconds initial delay before first check
};

// Track user behavior
let userBehavior = {
    scrollHistory: [],
    servicesScrollCount: 0,
    lastScrollPosition: 0,
    scrollDirectionChanges: 0,
    timeOnPage: 0,
    lastActionTime: Date.now(),
    startTime: Date.now(),
    servicesSectionVisited: false,
    scrollBackToServices: 0,
    clicksCount: 0
};

// Track if user is in services section
let isInServicesSection = false;
let servicesSectionTop = 0;
let servicesSectionBottom = 0;

// Initialize behavior tracking
function initBehaviorTracking() {
    // Find services section position
    const servicesSection = document.getElementById('services');
    if (servicesSection) {
        servicesSectionTop = servicesSection.offsetTop;
        servicesSectionBottom = servicesSectionTop + servicesSection.offsetHeight;
    }

    let lastScrollY = window.pageYOffset;
    let scrollDirection = 'down';
    
    // Optimized scroll behavior tracking (using requestAnimationFrame)
    let behaviorScrollTicking = false;
    function trackScrollBehavior() {
        const currentScrollY = window.pageYOffset || window.scrollY;
        const scrollTop = currentScrollY || document.documentElement.scrollTop;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const scrollPercent = (scrollTop / docHeight) * 100;
        
        // Track scroll history (last 10 positions)
        userBehavior.scrollHistory.push({
            position: scrollTop,
            time: Date.now()
        });
        if (userBehavior.scrollHistory.length > 10) {
            userBehavior.scrollHistory.shift();
        }
        
        // Detect scroll direction changes (indicates confusion/indecision)
        const newDirection = currentScrollY > lastScrollY ? 'down' : 'up';
        if (newDirection !== scrollDirection && Math.abs(currentScrollY - lastScrollY) > 100) {
            userBehavior.scrollDirectionChanges++;
            scrollDirection = newDirection;
        }
        lastScrollY = currentScrollY;
        
        // Track if user is in services section
        const inServices = scrollTop >= servicesSectionTop - 200 && scrollTop <= servicesSectionBottom + 200;
        if (inServices && !isInServicesSection) {
            // User just entered services section
            isInServicesSection = true;
            userBehavior.servicesSectionVisited = true;
        } else if (!inServices && isInServicesSection) {
            // User left services section
            isInServicesSection = false;
            userBehavior.servicesScrollCount++;
            
            // If user scrolls back to services, they might be confused
            if (scrollTop < servicesSectionTop) {
                userBehavior.scrollBackToServices++;
            }
        }
        
        userBehavior.lastScrollPosition = scrollTop;
        userBehavior.lastActionTime = Date.now();
        behaviorScrollTicking = false;
    }
    
    window.addEventListener('scroll', function() {
        if (!behaviorScrollTicking) {
            window.requestAnimationFrame(trackScrollBehavior);
            behaviorScrollTicking = true;
        }
    }, { passive: true });

    // Track clicks (user taking action)
    document.addEventListener('click', function() {
        userBehavior.clicksCount++;
        userBehavior.lastActionTime = Date.now();
    });

    // Track time on page
    setInterval(function() {
        userBehavior.timeOnPage = Date.now() - userBehavior.startTime;
    }, 1000);
}

// Check if user seems clueless/confused
function userSeemsClueless() {
    // User has been on page for a while without taking action
    const timeSinceLastAction = Date.now() - userBehavior.lastActionTime;
    const noActionForAWhile = timeSinceLastAction > EXPERT_CONFIG.CONFUSION_TIME;
    
    // User has scrolled through services multiple times (looking but not sure)
    const scrolledServicesMultipleTimes = userBehavior.servicesScrollCount >= EXPERT_CONFIG.SERVICES_SCROLL_THRESHOLD;
    
    // User is scrolling back and forth (indecision)
    const scrollingBackAndForth = userBehavior.scrollDirectionChanges > 8;
    
    // User scrolled back to services after leaving (reconsidering)
    const reconsideringServices = userBehavior.scrollBackToServices >= 2;
    
    // User has been on page for a while, scrolled through services, but hasn't clicked much
    const engagedButInactive = userBehavior.timeOnPage > 60 * 1000 && 
                                userBehavior.servicesSectionVisited && 
                                userBehavior.clicksCount < 3;
    
    // Return true if any of these "clueless" indicators are present
    return (noActionForAWhile && userBehavior.servicesSectionVisited) ||
           scrolledServicesMultipleTimes ||
           (scrollingBackAndForth && userBehavior.servicesSectionVisited) ||
           reconsideringServices ||
           engagedButInactive;
}

// Check if user is actively browsing services
function isBrowsingServices() {
    const currentScroll = window.pageYOffset || document.documentElement.scrollTop;
    return currentScroll >= servicesSectionTop - 200 && 
           currentScroll <= servicesSectionBottom + 200 &&
           userBehavior.servicesSectionVisited;
}

// Check if modal was closed by user
function wasModalClosed() {
    return localStorage.getItem(EXPERT_CONFIG.CLOSED_KEY) === 'true';
}

// Check if enough time has passed since last shown
function shouldShowBasedOnTime() {
    const lastShown = localStorage.getItem(EXPERT_CONFIG.MODAL_KEY);
    if (!lastShown) {
        return true; // Never shown before
    }
    const timeSinceLastShown = Date.now() - parseInt(lastShown);
    return timeSinceLastShown >= EXPERT_CONFIG.INTERVAL;
}

// Check if enough time has passed since user closed it
function enoughTimeAfterClose() {
    const closedTime = localStorage.getItem(EXPERT_CONFIG.CLOSED_KEY + '_time');
    if (!closedTime) {
        return true; // Never closed before
    }
    const timeSinceClose = Date.now() - parseInt(closedTime);
    return timeSinceClose >= EXPERT_CONFIG.MIN_TIME_AFTER_CLOSE;
}

// Determine if modal should be shown
function shouldShowExpertModal() {
    // Don't show if modal is already visible
    if (expertConsultationModal && expertConsultationModal.classList.contains('show')) {
        return false;
    }
    
    // If never closed, show when:
    // 1. User is browsing services section
    // 2. Enough time has passed
    if (!wasModalClosed()) {
        if (shouldShowBasedOnTime() && isBrowsingServices()) {
            return true;
        }
        return false;
    }
    
    // If closed before, only show if:
    // 1. Enough time has passed since last shown
    // 2. Enough time has passed since user closed it
    // 3. User seems clueless/confused (needs help)
    if (shouldShowBasedOnTime() && enoughTimeAfterClose() && userSeemsClueless()) {
        return true;
    }
    
    return false;
}

// Show Expert Modal
function showExpertModal() {
    if (!expertConsultationModal) return;
    
    if (shouldShowExpertModal()) {
        expertConsultationModal.classList.add('show');
        document.body.style.overflow = 'hidden';
        localStorage.setItem(EXPERT_CONFIG.MODAL_KEY, Date.now().toString());
        
        // Reset some behavior tracking to avoid immediate re-triggering
        userBehavior.scrollDirectionChanges = 0;
        userBehavior.scrollBackToServices = 0;
    }
}

// Close Expert Modal
function closeExpertModal() {
    if (expertConsultationModal) {
        expertConsultationModal.classList.remove('show');
        document.body.style.overflow = 'auto';
        localStorage.setItem(EXPERT_CONFIG.CLOSED_KEY, 'true');
        localStorage.setItem(EXPERT_CONFIG.CLOSED_KEY + '_time', Date.now().toString());
        
        // Reset behavior tracking when user closes
        userBehavior.lastActionTime = Date.now();
    }
}

// Set up close handlers
if (expertCloseBtn && expertConsultationModal) {
    expertCloseBtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        closeExpertModal();
    });
}

if (expertConsultationModal) {
    expertConsultationModal.addEventListener('click', function(event) {
        if (event.target === expertConsultationModal || event.target.classList.contains('expert-modal-backdrop')) {
            closeExpertModal();
        }
    });
}

// Initialize on page load - Optimized to not block LCP
document.addEventListener('DOMContentLoaded', function() {
    // Initialize behavior tracking immediately (lightweight, non-blocking)
    initBehaviorTracking();
    
    // Defer expert modal logic to avoid blocking LCP
    function initExpertModalSystem() {
        // Check if welcome modal is showing
        const checkWelcomeModal = setInterval(function() {
            const welcomeShowing = welcomeModal && welcomeModal.classList.contains('show');
            
            if (!welcomeShowing) {
                clearInterval(checkWelcomeModal);
                
                // Initial delay before first check (to avoid immediate popup)
                setTimeout(function() {
                    // Check periodically if modal should be shown (every 8 seconds - faster)
                    setInterval(function() {
                        if (!expertConsultationModal.classList.contains('show')) {
                            showExpertModal();
                        }
                    }, 8 * 1000); // Check every 8 seconds (reduced from 10)
                }, EXPERT_CONFIG.INITIAL_DELAY);
            }
        }, 500);
        
        // Also check when user scrolls through services (faster response)
        window.addEventListener('scroll', function() {
            if (isBrowsingServices() && !expertConsultationModal.classList.contains('show')) {
                // Debounce: only check after user stops scrolling for 1 second (reduced from 2)
                clearTimeout(window.servicesScrollTimeout);
                window.servicesScrollTimeout = setTimeout(function() {
                    if (shouldShowExpertModal()) {
                        showExpertModal();
                    }
                }, 1000); // Reduced from 2000ms to 1000ms
            }
        }, { passive: true });
    }
    
    // Use requestIdleCallback to defer modal initialization (non-blocking)
    if ('requestIdleCallback' in window) {
        requestIdleCallback(initExpertModalSystem, { timeout: 3000 });
    } else {
        setTimeout(initExpertModalSystem, 2000);
    }
});

// Smooth Scrolling for anchor links - Fixed to not interfere with kids button
document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        // Skip the kids appointment button
        if (anchor.id === 'kidsAppointmentBtn') {
            return;
        }
        anchor.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (href !== '#' && href !== '') {
                e.preventDefault();
                const target = document.querySelector(href);
                if (target) {
                    const offsetTop = target.offsetTop - 80;
                    window.scrollTo({
                        top: offsetTop,
                        behavior: 'smooth'
                    });
                }
            }
        });
    });
});

// Contact Form Submission with EmailJS
const appointmentForm = document.getElementById('appointmentForm');
if (appointmentForm) {
    appointmentForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Get form data
        const name = document.getElementById('contactName').value;
        const email = document.getElementById('contactEmail').value;
        const phone = document.getElementById('contactPhone').value;
        const service = document.getElementById('contactService').value;
        const message = document.getElementById('contactMessage').value;

        // Create contact data object
        const contactData = {
            name: name,
            email: email,
            phone: phone,
            service: service,
            message: message || 'No additional message'
        };

        // Save to localStorage as backup
        try {
            let savedContacts = JSON.parse(localStorage.getItem('dnaContacts') || '[]');
            savedContacts.push(contactData);
            localStorage.setItem('dnaContacts', JSON.stringify(savedContacts));
        } catch (error) {
            // localStorage not available or quota exceeded
        }

        // Send email using EmailJS
        const EMAILJS_CONFIG = {
            PUBLIC_KEY: '2fdaHy-1vPUqWh23A', // EmailJS Public Key
            SERVICE_ID: 'service_13xdgm3', // EmailJS Service ID
            TEMPLATE_ID: 'template_lpjsx54' // EmailJS Template ID
        };

        // Prepare email data
        const emailData = {
            to_email: 'dentalaestheticsmiles@gmail.com', // DNA Clinic official email
            name: name,
            email: email,
            phone: phone,
            service: service,
            message: message || 'No additional message'
        };

        // Send email via EmailJS
        if (EMAILJS_CONFIG.PUBLIC_KEY && typeof emailjs !== 'undefined') {
            emailjs.send(
                EMAILJS_CONFIG.SERVICE_ID,
                EMAILJS_CONFIG.TEMPLATE_ID,
                emailData,
                EMAILJS_CONFIG.PUBLIC_KEY
            )
            .then(function(response) {
                // Email sent successfully
            }, function(error) {
                // Email sending failed - show user-friendly message
                alert('⚠️ There was an issue sending your contact request. Please contact us directly at dentalaestheticsmiles@gmail.com or call us. Your contact details have been saved.');
            });
        }

        // Success message
        const successMessage = `🎉 Thank you, ${name}!\n\nYour appointment request for ${service} has been received.\n\nWe will contact you at ${phone} or ${email} shortly.\n\nWe look forward to serving you! 😊`;
        
        alert(successMessage);
        
        // Reset form
        this.reset();
    });
}

// Kids Appointment Modal - Initialize after DOM is loaded
function initKidsModal() {
    const kidsAppointmentBtn = document.getElementById('kidsAppointmentBtn');
    const kidsAppointmentModal = document.getElementById('kidsAppointmentModal');
    const kidsCloseModal = document.querySelector('.kids-close-modal');
    const kidsAppointmentForm = document.getElementById('kidsAppointmentForm');

        // Initialize Kids Modal (console logs removed for production)

    // Set minimum date to today
    const kidDateInput = document.getElementById('kidDate');
    if (kidDateInput) {
        const today = new Date().toISOString().split('T')[0];
        kidDateInput.setAttribute('min', today);
    }

    // Open Kids Modal - Use direct event handler with higher priority
    if (kidsAppointmentBtn && kidsAppointmentModal) {
        // Remove href to prevent navigation
        kidsAppointmentBtn.setAttribute('href', 'javascript:void(0);');
        
        // Add click handler with capture phase for higher priority
        kidsAppointmentBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            if (kidsAppointmentModal) {
                kidsAppointmentModal.classList.add('show');
                document.body.style.overflow = 'hidden';
            }
            return false;
        }, true); // Use capture phase for higher priority
        
        // Also add as regular listener as backup
        kidsAppointmentBtn.onclick = function(e) {
            e.preventDefault();
            e.stopPropagation();
            if (kidsAppointmentModal) {
                kidsAppointmentModal.classList.add('show');
                document.body.style.overflow = 'hidden';
            }
            return false;
        };
    }

    // Close Kids Modal
    if (kidsCloseModal && kidsAppointmentModal) {
        kidsCloseModal.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            if (kidsAppointmentModal) {
                kidsAppointmentModal.classList.remove('show');
                document.body.style.overflow = 'auto';
            }
        });
    }

    // REMOVED: Close Kids Modal when clicking outside - Modal only closes via close button now

    // Kids Form Submission
    if (kidsAppointmentForm) {
        kidsAppointmentForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Get form data
            const parentName = document.getElementById('parentName').value;
            const kidName = document.getElementById('kidName').value;
            const email = document.getElementById('kidEmail').value;
            const phone = document.getElementById('kidPhone').value;
            const service = document.getElementById('kidService').value;
            const date = document.getElementById('kidDate').value;
            const time = document.getElementById('kidTime').value;
            const message = document.getElementById('kidMessage').value;

            // Format date for display
            const formattedDate = new Date(date).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });

            // Create appointment data object
            const appointmentData = {
                parentName: parentName,
                kidName: kidName,
                email: email,
                phone: phone,
                service: service,
                date: date,
                formattedDate: formattedDate,
                time: time,
                message: message,
                timestamp: new Date().toISOString()
            };

            // Save to localStorage as backup
            try {
                let savedAppointments = JSON.parse(localStorage.getItem('dnaKidsAppointments') || '[]');
                savedAppointments.push(appointmentData);
                localStorage.setItem('dnaKidsAppointments', JSON.stringify(savedAppointments));
            } catch (error) {
                // localStorage not available or quota exceeded
            }

            // Send email using EmailJS
            const EMAILJS_CONFIG = {
                PUBLIC_KEY: '2fdaHy-1vPUqWh23A', // EmailJS Public Key
                SERVICE_ID: 'service_13xdgm3', // EmailJS Service ID
                TEMPLATE_ID: 'template_lpjsx54' // EmailJS Template ID
            };

            // Prepare email data
            const emailData = {
                to_email: 'dentalaestheticsmiles@gmail.com', // DNA Clinic official email
                parent_name: parentName,
                kid_name: kidName,
                parent_email: email,
                phone: phone,
                service: service,
                appointment_date: formattedDate,
                appointment_time: time,
                message: message || 'No additional message'
            };

            // Send email via EmailJS
            if (EMAILJS_CONFIG.PUBLIC_KEY && typeof emailjs !== 'undefined') {
                emailjs.send(
                    EMAILJS_CONFIG.SERVICE_ID,
                    EMAILJS_CONFIG.TEMPLATE_ID,
                    emailData,
                    EMAILJS_CONFIG.PUBLIC_KEY
                )
                .then(function(response) {
                    // Email sent successfully
                }, function(error) {
                    // Email sending failed - show user-friendly message
                    alert('⚠️ There was an issue sending your appointment request. Please contact us directly at dentalaestheticsmiles@gmail.com or call us. Your appointment details have been saved.');
                });
            }

            // Success message
            const successMessage = `🎉 Thank you, ${parentName}!\n\nWe're excited to meet ${kidName}!\n\nAppointment Details:\n📅 Date: ${formattedDate}\n⏰ Time: ${time}\n🦷 Service: ${service}\n\nWe'll contact you at ${phone} to confirm the appointment. See you soon! 😊`;
            
            alert(successMessage);
            
            // Reset form
            this.reset();
            
            // Close modal
            if (kidsAppointmentModal) {
                kidsAppointmentModal.classList.remove('show');
                document.body.style.overflow = 'auto';
            }
        });
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initKidsModal);
} else {
    // DOM is already loaded
    initKidsModal();
}

// Intersection Observer for Fade-in Animations (Optimized with GPU acceleration)
if ('IntersectionObserver' in window) {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translate3d(0, 0, 0)';
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    // Observe elements for animation - Defer to avoid blocking LCP
    function initAnimations() {
        const animateElements = document.querySelectorAll('.service-card, .blog-card, .tour-item, .feature-item');
        animateElements.forEach(el => {
            el.style.opacity = '0';
            el.style.transform = 'translate3d(0, 30px, 0)';
            el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
            el.style.willChange = 'opacity, transform';
            observer.observe(el);
        });
    }
    
    // Defer animation initialization
    if ('requestIdleCallback' in window) {
        document.addEventListener('DOMContentLoaded', function() {
            requestIdleCallback(initAnimations, { timeout: 2000 });
        });
    } else {
        document.addEventListener('DOMContentLoaded', function() {
            setTimeout(initAnimations, 1000);
        });
    }
}

// Service Card Hover Effect Enhancement (Optimized with GPU acceleration) - Deferred
function initHoverEffects() {
    const serviceCards = document.querySelectorAll('.service-card');
    serviceCards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translate3d(0, -10px, 0) scale(1.02)';
        });
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translate3d(0, 0, 0) scale(1)';
        });
    });
}

if ('requestIdleCallback' in window) {
    document.addEventListener('DOMContentLoaded', function() {
        requestIdleCallback(initHoverEffects, { timeout: 2000 });
    });
} else {
    document.addEventListener('DOMContentLoaded', function() {
        setTimeout(initHoverEffects, 1000);
    });
}

// Tour Gallery Image Zoom Effect (Optimized with GPU acceleration) - Deferred
function initTourEffects() {
    const tourItems = document.querySelectorAll('.tour-item');
    tourItems.forEach(item => {
        item.addEventListener('mouseenter', function() {
            const img = this.querySelector('img');
            if (img) {
                img.style.transform = 'scale3d(1.15, 1.15, 1)';
            }
        });
        item.addEventListener('mouseleave', function() {
            const img = this.querySelector('img');
            if (img) {
                img.style.transform = 'scale3d(1, 1, 1)';
            }
        });
    });
}

if ('requestIdleCallback' in window) {
    document.addEventListener('DOMContentLoaded', function() {
        requestIdleCallback(initTourEffects, { timeout: 2000 });
    });
} else {
    document.addEventListener('DOMContentLoaded', function() {
        setTimeout(initTourEffects, 1000);
    });
}

// Optimized image loading (removed to prevent layout shifts - images now have explicit dimensions)

// Social media links are handled via href attributes (no tracking needed for performance)

// Optimized parallax effect (using GPU acceleration)
let lastScrollY = 0;
let ticking = false;

function updateParallax() {
    const scrolled = window.pageYOffset || window.scrollY;
    const hero = document.querySelector('.hero');
    if (hero && scrolled < window.innerHeight) {
        hero.style.transform = `translate3d(0, ${scrolled * 0.5}px, 0)`;
    }
    ticking = false;
}

window.addEventListener('scroll', function() {
    if (!ticking) {
        window.requestAnimationFrame(updateParallax);
        ticking = true;
    }
}, { passive: true });

// Counter Animation (if you want to add statistics)
function animateCounter(element, target, duration = 2000) {
    let start = 0;
    const increment = target / (duration / 16);
    const timer = setInterval(() => {
        start += increment;
        if (start >= target) {
            element.textContent = target;
            clearInterval(timer);
        } else {
            element.textContent = Math.floor(start);
        }
    }, 16);
}

// Lazy loading for images (performance optimization)
if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                if (img.dataset.src) {
                    img.src = img.dataset.src;
                    img.removeAttribute('data-src');
                    imageObserver.unobserve(img);
                }
            }
        });
    });

    document.querySelectorAll('img[data-src]').forEach(img => {
        imageObserver.observe(img);
    });
}

// Optimized smooth reveal animation on scroll (GPU accelerated)
if ('IntersectionObserver' in window) {
    const revealElements = document.querySelectorAll('.about-content, .referral-content, .contact-content');
    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translate3d(0, 0, 0)';
                revealObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.2 });

    document.addEventListener('DOMContentLoaded', function() {
        revealElements.forEach(el => {
            el.style.opacity = '0';
            el.style.transform = 'translate3d(0, 30px, 0)';
            el.style.transition = 'opacity 0.8s ease, transform 0.8s ease';
            el.style.willChange = 'opacity, transform';
            revealObserver.observe(el);
        });
    });
}

// Team Carousel Functionality
let currentTeamIndex = 0;
const teamMembers = document.querySelectorAll('.team-member');
const teamDots = document.querySelectorAll('.dot');
const teamPrevBtn = document.getElementById('teamPrevBtn');
const teamNextBtn = document.getElementById('teamNextBtn');

function showTeamMember(index) {
    // Remove active class from all members and dots
    teamMembers.forEach(member => member.classList.remove('active'));
    teamDots.forEach(dot => dot.classList.remove('active'));
    
    // Add active class to current member and dot
    if (teamMembers[index]) {
        teamMembers[index].classList.add('active');
    }
    if (teamDots[index]) {
        teamDots[index].classList.add('active');
    }
}

function nextTeamMember() {
    currentTeamIndex = (currentTeamIndex + 1) % teamMembers.length;
    showTeamMember(currentTeamIndex);
}

function prevTeamMember() {
    currentTeamIndex = (currentTeamIndex - 1 + teamMembers.length) % teamMembers.length;
    showTeamMember(currentTeamIndex);
}

// Event listeners for carousel buttons
if (teamPrevBtn) {
    teamPrevBtn.addEventListener('click', prevTeamMember);
}

if (teamNextBtn) {
    teamNextBtn.addEventListener('click', nextTeamMember);
}

// Event listeners for dots
teamDots.forEach((dot, index) => {
    dot.addEventListener('click', () => {
        currentTeamIndex = index;
        showTeamMember(currentTeamIndex);
    });
});

// Auto-play carousel (optional - can be disabled)
let carouselInterval;
function startCarousel() {
    carouselInterval = setInterval(nextTeamMember, 5000); // Change slide every 5 seconds
}

function stopCarousel() {
    clearInterval(carouselInterval);
}

// Auto-play disabled - carousel only moves when buttons are clicked
// Uncomment below if you want auto-play when you have multiple team members
// if (teamMembers.length > 1) {
//     startCarousel();
//     
//     // Pause on hover
//     if (teamCarousel) {
//         teamCarousel.addEventListener('mouseenter', stopCarousel);
//         teamCarousel.addEventListener('mouseleave', startCarousel);
//     }
// }

// Touch/swipe support for mobile
let touchStartX = 0;
let touchEndX = 0;
const teamCarousel = document.getElementById('teamCarousel');

if (teamCarousel) {
    teamCarousel.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
    });

    teamCarousel.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    });
}

function handleSwipe() {
    if (touchEndX < touchStartX - 50) {
        nextTeamMember(); // Swipe left - next
    }
    if (touchEndX > touchStartX + 50) {
        prevTeamMember(); // Swipe right - previous
    }
}

// Optimize Deepika's image loading (preload for LCP)
document.addEventListener('DOMContentLoaded', function() {
    const deepikaImg = document.getElementById('deepikaImage');
    if (deepikaImg && !deepikaImg.complete) {
        // Preload the image for better LCP
        const link = document.createElement('link');
        link.rel = 'preload';
        link.as = 'image';
        link.href = 'deepika.png';
        document.head.appendChild(link);
    }
});

