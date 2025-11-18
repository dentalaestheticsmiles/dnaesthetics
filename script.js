// Navigation Scroll Effect
window.addEventListener('scroll', function() {
    const navbar = document.getElementById('navbar');
    if (window.scrollY > 50) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
});

// Mobile Menu Toggle
const hamburger = document.getElementById('hamburger');
const navMenu = document.getElementById('navMenu');

hamburger.addEventListener('click', function() {
    hamburger.classList.toggle('active');
    navMenu.classList.toggle('active');
});

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

window.addEventListener('scroll', activeLink);

// Welcome Modal
const welcomeModal = document.getElementById('welcomeModal');
const closeModal = document.querySelector('.close-modal');

// Check if user has visited before
function hasVisitedBefore() {
    return localStorage.getItem('hasVisited') === 'true';
}

function setVisited() {
    localStorage.setItem('hasVisited', 'true');
}

// Show modal on first visit
if (!hasVisitedBefore()) {
    setTimeout(() => {
        welcomeModal.classList.add('show');
        setVisited();
    }, 1000);
}

// Close modal
closeModal.addEventListener('click', function() {
    welcomeModal.classList.remove('show');
    // Show expert modal after welcome modal closes (if enough time has passed)
    setTimeout(() => {
        showExpertModal();
    }, 2000);
});

// Close modal when clicking outside
window.addEventListener('click', function(event) {
    if (event.target === welcomeModal) {
        welcomeModal.classList.remove('show');
        // Show expert modal after welcome modal closes (if enough time has passed)
        setTimeout(() => {
            showExpertModal();
        }, 2000);
    }
});

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
    
    // Track scroll behavior
    window.addEventListener('scroll', function() {
        const currentScrollY = window.pageYOffset;
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
    });

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

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    // Initialize behavior tracking
    initBehaviorTracking();
    
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
    });
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
            console.log('✅ Contact form saved to localStorage');
        } catch (error) {
            console.error('Error saving to localStorage:', error);
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
            console.log('📧 Sending contact form email notification...');
            emailjs.send(
                EMAILJS_CONFIG.SERVICE_ID,
                EMAILJS_CONFIG.TEMPLATE_ID,
                emailData,
                EMAILJS_CONFIG.PUBLIC_KEY
            )
            .then(function(response) {
                console.log('✅ Contact form email sent successfully!', response.status, response.text);
            }, function(error) {
                console.error('❌ Contact form email sending failed!');
                console.error('Error status:', error.status);
                console.error('Error text:', error.text);
                alert('⚠️ There was an issue sending your contact request. Please contact us directly at dentalaestheticsmiles@gmail.com or call us. Your contact details have been saved.');
            });
        } else {
            console.warn('⚠️ EmailJS not properly configured');
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

    // Debug: Log to console
    console.log('Initializing Kids Modal...');
    console.log('Kids Appointment Button:', kidsAppointmentBtn);
    console.log('Kids Appointment Modal:', kidsAppointmentModal);

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
            console.log('✅ Button clicked, opening modal');
            kidsAppointmentModal.classList.add('show');
            document.body.style.overflow = 'hidden';
            return false;
        }, true); // Use capture phase for higher priority
        
        // Also add as regular listener as backup
        kidsAppointmentBtn.onclick = function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('✅ Button clicked (onclick), opening modal');
            kidsAppointmentModal.classList.add('show');
            document.body.style.overflow = 'hidden';
            return false;
        };
        
        console.log('✅ Kids appointment button handler attached');
    } else {
        console.error('❌ Kids appointment button or modal not found!', {
            button: kidsAppointmentBtn,
            modal: kidsAppointmentModal
        });
    }

    // Close Kids Modal
    if (kidsCloseModal && kidsAppointmentModal) {
        kidsCloseModal.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('Closing modal');
            kidsAppointmentModal.classList.remove('show');
            document.body.style.overflow = 'auto';
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
                console.log('✅ Appointment saved to localStorage');
            } catch (error) {
                console.error('Error saving to localStorage:', error);
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
                console.log('📧 Sending email notification...');
                emailjs.send(
                    EMAILJS_CONFIG.SERVICE_ID,
                    EMAILJS_CONFIG.TEMPLATE_ID,
                    emailData,
                    EMAILJS_CONFIG.PUBLIC_KEY
                )
                .then(function(response) {
                    console.log('✅ Email sent successfully!', response.status, response.text);
                }, function(error) {
                    console.error('❌ Email sending failed!');
                    console.error('Error status:', error.status);
                    console.error('Error text:', error.text);
                    alert('⚠️ There was an issue sending your appointment request. Please contact us directly at dentalaestheticsmiles@gmail.com or call us. Your appointment details have been saved.');
                });
            } else {
                console.warn('⚠️ EmailJS not properly configured');
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

// Intersection Observer for Fade-in Animations
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver(function(entries) {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

// Observe elements for animation
document.addEventListener('DOMContentLoaded', function() {
    const animateElements = document.querySelectorAll('.service-card, .blog-card, .tour-item, .feature-item');
    animateElements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });
});

// Service Card Hover Effect Enhancement
const serviceCards = document.querySelectorAll('.service-card');
serviceCards.forEach(card => {
    card.addEventListener('mouseenter', function() {
        this.style.transform = 'translateY(-10px) scale(1.02)';
    });
    card.addEventListener('mouseleave', function() {
        this.style.transform = 'translateY(0) scale(1)';
    });
});

// Tour Gallery Image Zoom Effect
const tourItems = document.querySelectorAll('.tour-item');
tourItems.forEach(item => {
    item.addEventListener('mouseenter', function() {
        const img = this.querySelector('img');
        img.style.transform = 'scale(1.15)';
    });
    item.addEventListener('mouseleave', function() {
        const img = this.querySelector('img');
        img.style.transform = 'scale(1)';
    });
});

// Add loading animation for images - Fixed to handle already loaded images
document.addEventListener('DOMContentLoaded', function() {
    const images = document.querySelectorAll('img');
    images.forEach(img => {
        // Check if image is already loaded
        if (img.complete && img.naturalHeight !== 0) {
            img.style.opacity = '1';
        } else {
            img.style.opacity = '0';
            img.style.transition = 'opacity 0.3s ease';
            img.addEventListener('load', function() {
                this.style.opacity = '1';
            });
            // Fallback: show image after 1 second even if load event doesn't fire
            setTimeout(() => {
                if (img.style.opacity === '0') {
                    img.style.opacity = '1';
                }
            }, 1000);
        }
    });
});

// WhatsApp Float Button Click Tracking (optional)
const whatsappFloat = document.querySelector('.whatsapp-float');
if (whatsappFloat) {
    whatsappFloat.addEventListener('click', function() {
        // You can add analytics tracking here
        console.log('WhatsApp button clicked');
    });
}

// Social Media Link Tracking (optional)
const socialLinks = document.querySelectorAll('.social-link, .footer-social a');
socialLinks.forEach(link => {
    link.addEventListener('click', function() {
        const platform = this.classList.contains('instagram') ? 'Instagram' :
                        this.classList.contains('facebook') ? 'Facebook' :
                        this.classList.contains('whatsapp') ? 'WhatsApp' : 'Social';
        console.log(`${platform} link clicked`);
    });
});

// Add parallax effect to hero section
window.addEventListener('scroll', function() {
    const scrolled = window.pageYOffset;
    const hero = document.querySelector('.hero');
    if (hero && scrolled < window.innerHeight) {
        hero.style.transform = `translateY(${scrolled * 0.5}px)`;
    }
});

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

// Add smooth reveal animation on scroll
const revealElements = document.querySelectorAll('.about-content, .referral-content, .contact-content');
const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, { threshold: 0.2 });

revealElements.forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(30px)';
    el.style.transition = 'opacity 0.8s ease, transform 0.8s ease';
    revealObserver.observe(el);
});

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

// Force load Deepika's image
document.addEventListener('DOMContentLoaded', function() {
    const deepikaImg = document.getElementById('deepikaImage');
    if (deepikaImg) {
        // Try multiple path variations
        const paths = [
            'deepika.png',
            './deepika.png',
            'dna-clinic-website/deepika.png',
            window.location.pathname.replace('index.html', '') + 'deepika.png'
        ];
        
        let currentPathIndex = 0;
        
        function tryNextPath() {
            if (currentPathIndex < paths.length) {
                const testImg = new Image();
                testImg.onload = function() {
                    console.log('✅ Image loaded from:', paths[currentPathIndex]);
                    deepikaImg.src = paths[currentPathIndex];
                    deepikaImg.style.display = 'block';
                    deepikaImg.style.opacity = '1';
                    deepikaImg.style.visibility = 'visible';
                };
                testImg.onerror = function() {
                    console.log('❌ Failed to load from:', paths[currentPathIndex]);
                    currentPathIndex++;
                    tryNextPath();
                };
                testImg.src = paths[currentPathIndex];
            } else {
                console.error('❌ Could not load image from any path');
                alert('Image not found. Please ensure deepika.png is in the same folder as index.html');
            }
        }
        
        // Set initial styles
        deepikaImg.style.display = 'block';
        deepikaImg.style.width = '100%';
        deepikaImg.style.height = '100%';
        deepikaImg.style.objectFit = 'cover';
        deepikaImg.style.opacity = '1';
        deepikaImg.style.visibility = 'visible';
        
        // Try loading
        tryNextPath();
    }
});

console.log('DNA Clinic website loaded successfully!');

