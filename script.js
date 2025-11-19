// ============================================
// DNA CLINIC WEBSITE - MAIN JAVASCRIPT FILE
// Fully error-proof with all null checks and safe DOM handling
// ============================================

document.addEventListener("DOMContentLoaded", function() {
    'use strict';

    // ============================================
    // NAVIGATION SCROLL EFFECT
    // ============================================
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

    // ============================================
    // MOBILE MENU TOGGLE
    // ============================================
    function initMobileMenu() {
        const hamburger = document.getElementById('hamburger');
        const navMenu = document.getElementById('navMenu');
        
        if (hamburger && navMenu) {
            // Remove any existing listeners to prevent duplicates
            const newHamburger = hamburger.cloneNode(true);
            hamburger.parentNode.replaceChild(newHamburger, hamburger);
            const newNavMenu = navMenu.cloneNode(true);
            navMenu.parentNode.replaceChild(newNavMenu, navMenu);
            
            const freshHamburger = document.getElementById('hamburger');
            const freshNavMenu = document.getElementById('navMenu');
            
            if (freshHamburger && freshNavMenu) {
                freshHamburger.addEventListener('click', function() {
                    freshHamburger.classList.toggle('active');
                    freshNavMenu.classList.toggle('active');
                    const isExpanded = freshHamburger.classList.contains('active');
                    freshHamburger.setAttribute('aria-expanded', isExpanded);
                });
                
                // Close mobile menu when clicking on a link
                const navLinks = document.querySelectorAll('.nav-link');
                navLinks.forEach(link => {
                    link.addEventListener('click', function() {
                        if (freshHamburger) freshHamburger.classList.remove('active');
                        if (freshNavMenu) freshNavMenu.classList.remove('active');
                    });
                });
            }
        }
    }
    initMobileMenu();

    // ============================================
    // ACTIVE NAVIGATION LINK
    // ============================================
    let sections, navLinksAll, scrollTicking = false;
    
    function activeLink() {
        if (!sections || !navLinksAll || sections.length === 0 || navLinksAll.length === 0) return;
        let current = '';
        sections.forEach(section => {
            if (section && section.offsetTop !== undefined) {
                const sectionTop = section.offsetTop;
                if (window.scrollY >= sectionTop - 200) {
                    current = section.getAttribute('id');
                }
            }
        });
        navLinksAll.forEach(link => {
            if (link) {
                link.classList.remove('active');
                if (link.getAttribute('href') === `#${current}`) {
                    link.classList.add('active');
                }
            }
        });
    }
    
    function handleScroll() {
        activeLink();
        scrollTicking = false;
    }
    
    sections = document.querySelectorAll('section[id]');
    navLinksAll = document.querySelectorAll('.nav-link');
    
    // Only add scroll listener if sections and navLinks exist
    if (sections && sections.length > 0 && navLinksAll && navLinksAll.length > 0) {
        window.addEventListener('scroll', function() {
            if (!scrollTicking) {
                window.requestAnimationFrame(handleScroll);
                scrollTicking = true;
            }
        }, { passive: true });
    }

    // ============================================
    // WELCOME MODAL
    // ============================================
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

    // Close modal handlers
    if (closeModal && welcomeModal) {
        // Remove any existing listeners
        const newCloseModal = closeModal.cloneNode(true);
        closeModal.parentNode.replaceChild(newCloseModal, closeModal);
        const freshCloseModal = document.querySelector('.close-modal');
        
        if (freshCloseModal) {
            freshCloseModal.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                if (welcomeModal) {
                    welcomeModal.classList.remove('show');
                    document.body.style.overflow = 'auto';
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
                    document.body.style.overflow = 'auto';
                    // Show expert modal after welcome modal closes
                    setTimeout(() => {
                        if (typeof showExpertModal === 'function') {
                            showExpertModal();
                        }
                    }, 2000);
                }
            });
        }
    }

    // ============================================
    // EXPERT DENTIST CONSULTATION MODAL
    // ============================================
    const expertConsultationModal = document.getElementById('expertConsultationModal');
    const expertCloseBtn = document.querySelector('.expert-close-btn');

    // Configuration
    const EXPERT_CONFIG = {
        MODAL_KEY: 'expertModalLastShown',
        CLOSED_KEY: 'expertModalClosed',
        INTEREST_KEY: 'expertModalInterest',
        SERVICES_SCROLL_KEY: 'expertModalServicesScrolled',
        INTERVAL: 3 * 60 * 1000,
        MIN_TIME_AFTER_CLOSE: 1.5 * 60 * 1000,
        SERVICES_SCROLL_THRESHOLD: 2,
        CONFUSION_TIME: 30 * 1000,
        MIN_SCROLL_DEPTH: 30,
        INITIAL_DELAY: 15 * 1000
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
        
        // Optimized scroll behavior tracking
        let behaviorScrollTicking = false;
        function trackScrollBehavior() {
            const currentScrollY = window.pageYOffset || window.scrollY;
            const scrollTop = currentScrollY || document.documentElement.scrollTop;
            const docHeight = document.documentElement.scrollHeight - window.innerHeight;
            const scrollPercent = (scrollTop / docHeight) * 100;
            
            // Track scroll history
            userBehavior.scrollHistory.push({
                position: scrollTop,
                time: Date.now()
            });
            if (userBehavior.scrollHistory.length > 10) {
                userBehavior.scrollHistory.shift();
            }
            
            // Detect scroll direction changes
            const newDirection = currentScrollY > lastScrollY ? 'down' : 'up';
            if (newDirection !== scrollDirection && Math.abs(currentScrollY - lastScrollY) > 100) {
                userBehavior.scrollDirectionChanges++;
                scrollDirection = newDirection;
            }
            lastScrollY = currentScrollY;
            
            // Track if user is in services section
            const inServices = scrollTop >= servicesSectionTop - 200 && scrollTop <= servicesSectionBottom + 200;
            if (inServices && !isInServicesSection) {
                isInServicesSection = true;
                userBehavior.servicesSectionVisited = true;
            } else if (!inServices && isInServicesSection) {
                isInServicesSection = false;
                userBehavior.servicesScrollCount++;
                
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

        // Track clicks
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
        const timeSinceLastAction = Date.now() - userBehavior.lastActionTime;
        const noActionForAWhile = timeSinceLastAction > EXPERT_CONFIG.CONFUSION_TIME;
        const scrolledServicesMultipleTimes = userBehavior.servicesScrollCount >= EXPERT_CONFIG.SERVICES_SCROLL_THRESHOLD;
        const scrollingBackAndForth = userBehavior.scrollDirectionChanges > 8;
        const reconsideringServices = userBehavior.scrollBackToServices >= 2;
        const engagedButInactive = userBehavior.timeOnPage > 60 * 1000 && 
                                    userBehavior.servicesSectionVisited && 
                                    userBehavior.clicksCount < 3;
        
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
        try {
            return localStorage.getItem(EXPERT_CONFIG.CLOSED_KEY) === 'true';
        } catch (e) {
            return false;
        }
    }

    // Check if enough time has passed since last shown
    function shouldShowBasedOnTime() {
        try {
            const lastShown = localStorage.getItem(EXPERT_CONFIG.MODAL_KEY);
            if (!lastShown) {
                return true;
            }
            const timeSinceLastShown = Date.now() - parseInt(lastShown);
            return timeSinceLastShown >= EXPERT_CONFIG.INTERVAL;
        } catch (e) {
            return true;
        }
    }

    // Check if enough time has passed since user closed it
    function enoughTimeAfterClose() {
        try {
            const closedTime = localStorage.getItem(EXPERT_CONFIG.CLOSED_KEY + '_time');
            if (!closedTime) {
                return true;
            }
            const timeSinceClose = Date.now() - parseInt(closedTime);
            return timeSinceClose >= EXPERT_CONFIG.MIN_TIME_AFTER_CLOSE;
        } catch (e) {
            return true;
        }
    }

    // Determine if modal should be shown
    function shouldShowExpertModal() {
        if (!expertConsultationModal || expertConsultationModal.classList.contains('show')) {
            return false;
        }
        
        if (!wasModalClosed()) {
            if (shouldShowBasedOnTime() && isBrowsingServices()) {
                return true;
            }
            return false;
        }
        
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
            try {
                localStorage.setItem(EXPERT_CONFIG.MODAL_KEY, Date.now().toString());
            } catch (e) {
                // localStorage not available
            }
            
            userBehavior.scrollDirectionChanges = 0;
            userBehavior.scrollBackToServices = 0;
        }
    }

    // Close Expert Modal
    function closeExpertModal() {
        if (expertConsultationModal) {
            expertConsultationModal.classList.remove('show');
            document.body.style.overflow = 'auto';
            try {
                localStorage.setItem(EXPERT_CONFIG.CLOSED_KEY, 'true');
                localStorage.setItem(EXPERT_CONFIG.CLOSED_KEY + '_time', Date.now().toString());
            } catch (e) {
                // localStorage not available
            }
            
            userBehavior.lastActionTime = Date.now();
        }
    }

    // Set up close handlers for expert modal
    if (expertCloseBtn && expertConsultationModal) {
        // Remove any existing listeners
        const newExpertCloseBtn = expertCloseBtn.cloneNode(true);
        expertCloseBtn.parentNode.replaceChild(newExpertCloseBtn, expertCloseBtn);
        const freshExpertCloseBtn = document.querySelector('.expert-close-btn');
        
        if (freshExpertCloseBtn) {
            freshExpertCloseBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                closeExpertModal();
            });
        }
    }

    if (expertConsultationModal) {
        expertConsultationModal.addEventListener('click', function(event) {
            if (event.target === expertConsultationModal || (event.target && event.target.classList.contains('expert-modal-backdrop'))) {
                closeExpertModal();
            }
        });
    }

    // Initialize behavior tracking
    initBehaviorTracking();
    
    // Defer expert modal logic
    function initExpertModalSystem() {
        const checkWelcomeModal = setInterval(function() {
            const welcomeShowing = welcomeModal && welcomeModal.classList.contains('show');
            
            if (!welcomeShowing) {
                clearInterval(checkWelcomeModal);
                
                setTimeout(function() {
                    setInterval(function() {
                        if (expertConsultationModal && !expertConsultationModal.classList.contains('show')) {
                            showExpertModal();
                        }
                    }, 8 * 1000);
                }, EXPERT_CONFIG.INITIAL_DELAY);
            }
        }, 500);
        
        window.addEventListener('scroll', function() {
            if (isBrowsingServices() && expertConsultationModal && !expertConsultationModal.classList.contains('show')) {
                clearTimeout(window.servicesScrollTimeout);
                window.servicesScrollTimeout = setTimeout(function() {
                    if (shouldShowExpertModal()) {
                        showExpertModal();
                    }
                }, 1000);
            }
        }, { passive: true });
    }
    
    if ('requestIdleCallback' in window) {
        requestIdleCallback(initExpertModalSystem, { timeout: 3000 });
    } else {
        setTimeout(initExpertModalSystem, 2000);
    }

    // ============================================
    // SMOOTH SCROLLING FOR ANCHOR LINKS
    // ============================================
    // IMPORTANT: Skip the kids appointment button to prevent conflicts
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        // Skip the kids appointment button - it should open modal, not scroll
        if (anchor.id === 'kidsAppointmentBtn' || anchor.getAttribute('href') === '#kidsAppointmentModal') {
            return;
        }
        
        anchor.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (href && href !== '#' && href !== '') {
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

    // ============================================
    // CONTACT FORM SUBMISSION WITH EMAILJS
    // ============================================
    const appointmentForm = document.getElementById('appointmentForm');
    if (appointmentForm) {
        appointmentForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Get form data with null checks
            const nameInput = document.getElementById('contactName');
            const emailInput = document.getElementById('contactEmail');
            const phoneInput = document.getElementById('contactPhone');
            const serviceInput = document.getElementById('contactService');
            const messageInput = document.getElementById('contactMessage');
            
            if (!nameInput || !emailInput || !phoneInput || !serviceInput || !messageInput) {
                alert('Please fill in all required fields.');
                return;
            }
            
            const name = nameInput.value.trim();
            const email = emailInput.value.trim();
            const phone = phoneInput.value.trim();
            const service = serviceInput.value;
            const message = messageInput.value.trim();

            if (!name || !email || !phone || !service) {
                alert('Please fill in all required fields.');
                return;
            }

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
                PUBLIC_KEY: '2fdaHy-1vPUqWh23A',
                SERVICE_ID: 'service_13xdgm3',
                TEMPLATE_ID: 'template_lpjsx54'
            };

            // Prepare email data
            const emailData = {
                to_email: 'dentalaestheticsmiles@gmail.com',
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
                    // Email sending failed
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

    // ============================================
    // KIDS APPOINTMENT MODAL
    // ============================================
    function initKidsModal() {
        const kidsAppointmentBtn = document.getElementById('kidsAppointmentBtn');
        const kidsAppointmentModal = document.getElementById('kidsAppointmentModal');
        const kidsCloseModal = document.querySelector('.kids-close-modal');
        const kidsAppointmentForm = document.getElementById('kidsAppointmentForm');

        // Set minimum date to today
        const kidDateInput = document.getElementById('kidDate');
        if (kidDateInput) {
            const today = new Date().toISOString().split('T')[0];
            kidDateInput.setAttribute('min', today);
        }

        // Open Kids Modal - with proper event handling
        if (kidsAppointmentBtn && kidsAppointmentModal) {
            // Remove any existing listeners by cloning
            const newBtn = kidsAppointmentBtn.cloneNode(true);
            kidsAppointmentBtn.parentNode.replaceChild(newBtn, kidsAppointmentBtn);
            const freshBtn = document.getElementById('kidsAppointmentBtn');
            
            if (freshBtn) {
                // Remove href to prevent navigation
                freshBtn.setAttribute('href', 'javascript:void(0);');
                
                // Single click handler with proper event handling
                freshBtn.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                    
                    if (kidsAppointmentModal) {
                        kidsAppointmentModal.classList.add('show');
                        document.body.style.overflow = 'hidden';
                    }
                    return false;
                }, true); // Use capture phase
            }
        }

        // Close Kids Modal
        if (kidsCloseModal && kidsAppointmentModal) {
            // Remove any existing listeners
            const newCloseBtn = kidsCloseModal.cloneNode(true);
            kidsCloseModal.parentNode.replaceChild(newCloseBtn, kidsCloseModal);
            const freshCloseBtn = document.querySelector('.kids-close-modal');
            
            if (freshCloseBtn) {
                freshCloseBtn.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    if (kidsAppointmentModal) {
                        kidsAppointmentModal.classList.remove('show');
                        document.body.style.overflow = 'auto';
                    }
                });
            }
        }

        // Kids Form Submission
        if (kidsAppointmentForm) {
            // Remove any existing listeners
            const newForm = kidsAppointmentForm.cloneNode(true);
            kidsAppointmentForm.parentNode.replaceChild(newForm, kidsAppointmentForm);
            const freshForm = document.getElementById('kidsAppointmentForm');
            
            if (freshForm) {
                freshForm.addEventListener('submit', function(e) {
                    e.preventDefault();
                    
                    // Get form data with null checks
                    const parentNameInput = document.getElementById('parentName');
                    const kidNameInput = document.getElementById('kidName');
                    const emailInput = document.getElementById('kidEmail');
                    const phoneInput = document.getElementById('kidPhone');
                    const serviceInput = document.getElementById('kidService');
                    const dateInput = document.getElementById('kidDate');
                    const timeInput = document.getElementById('kidTime');
                    const messageInput = document.getElementById('kidMessage');
                    
                    if (!parentNameInput || !kidNameInput || !emailInput || !phoneInput || 
                        !serviceInput || !dateInput || !timeInput) {
                        alert('Please fill in all required fields.');
                        return;
                    }
                    
                    const parentName = parentNameInput.value.trim();
                    const kidName = kidNameInput.value.trim();
                    const email = emailInput.value.trim();
                    const phone = phoneInput.value.trim();
                    const service = serviceInput.value;
                    const date = dateInput.value;
                    const time = timeInput.value;
                    const message = messageInput ? messageInput.value.trim() : '';

                    if (!parentName || !kidName || !email || !phone || !service || !date || !time) {
                        alert('Please fill in all required fields.');
                        return;
                    }

                    // Format date for display
                    let formattedDate = date;
                    try {
                        formattedDate = new Date(date).toLocaleDateString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                        });
                    } catch (e) {
                        formattedDate = date;
                    }

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
                        PUBLIC_KEY: '2fdaHy-1vPUqWh23A',
                        SERVICE_ID: 'service_13xdgm3',
                        TEMPLATE_ID: 'template_lpjsx54'
                    };

                    // Prepare email data
                    const emailData = {
                        to_email: 'dentalaestheticsmiles@gmail.com',
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
                            // Email sending failed
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
    }
    initKidsModal();

    // ============================================
    // INTERSECTION OBSERVER ANIMATIONS
    // ============================================
    if ('IntersectionObserver' in window) {
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };
        
        const observer = new IntersectionObserver(function(entries) {
            entries.forEach(entry => {
                if (entry.isIntersecting && entry.target) {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translate3d(0, 0, 0)';
                    observer.unobserve(entry.target);
                }
            });
        }, observerOptions);
        
        var animationsLoaded = false;
        function initAnimations() {
            if (animationsLoaded) return;
            animationsLoaded = true;
            const animateElements = document.querySelectorAll('.service-card, .blog-card, .tour-item, .feature-item, .testimonial-card');
            if (animateElements && animateElements.length > 0) {
                animateElements.forEach(el => {
                    if (el) {
                        el.style.opacity = '0';
                        el.style.transform = 'translate3d(0, 30px, 0)';
                        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
                        el.style.willChange = 'opacity, transform';
                        observer.observe(el);
                    }
                });
            }
        }
        
        ['click', 'touchstart', 'scroll'].forEach(function(e) {
            document.addEventListener(e, function() {
                if ('requestIdleCallback' in window) {
                    requestIdleCallback(initAnimations, { timeout: 2000 });
                } else {
                    setTimeout(initAnimations, 1000);
                }
            }, { once: true, passive: true });
        });
        setTimeout(function() {
            if ('requestIdleCallback' in window) {
                requestIdleCallback(initAnimations, { timeout: 2000 });
            } else {
                setTimeout(initAnimations, 2000);
            }
        }, 2000);
    }

    // ============================================
    // HOVER EFFECTS
    // ============================================
    var hoverEffectsLoaded = false;
    
    function initHoverEffects() {
        if (hoverEffectsLoaded) return;
        hoverEffectsLoaded = true;
        
        const serviceCards = document.querySelectorAll('.service-card');
        if (serviceCards && serviceCards.length > 0) {
            serviceCards.forEach(card => {
                if (card) {
                    card.addEventListener('mouseenter', function() {
                        this.style.transform = 'translate3d(0, -10px, 0) scale(1.02)';
                    });
                    card.addEventListener('mouseleave', function() {
                        this.style.transform = 'translate3d(0, 0, 0) scale(1)';
                    });
                }
            });
        }
        
        const tourItems = document.querySelectorAll('.tour-item');
        if (tourItems && tourItems.length > 0) {
            tourItems.forEach(item => {
                if (item) {
                    item.addEventListener('mouseenter', function() {
                        const img = this.querySelector('img');
                        if (img) img.style.transform = 'scale3d(1.15, 1.15, 1)';
                    });
                    item.addEventListener('mouseleave', function() {
                        const img = this.querySelector('img');
                        if (img) img.style.transform = 'scale3d(1, 1, 1)';
                    });
                }
            });
        }
    }
    
    document.addEventListener('mousemove', function() {
        if ('requestIdleCallback' in window) {
            requestIdleCallback(initHoverEffects, { timeout: 1000 });
        } else {
            setTimeout(initHoverEffects, 500);
        }
    }, { once: true, passive: true });
    
    setTimeout(function() {
        if ('requestIdleCallback' in window) {
            requestIdleCallback(initHoverEffects, { timeout: 2000 });
        } else {
            setTimeout(initHoverEffects, 2000);
        }
    }, 2000);

    // ============================================
    // PARALLAX EFFECT
    // ============================================
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

    // ============================================
    // LAZY LOADING FOR IMAGES
    // ============================================
    if ('IntersectionObserver' in window) {
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && entry.target) {
                    const img = entry.target;
                    if (img.dataset.src) {
                        img.src = img.dataset.src;
                        img.removeAttribute('data-src');
                        imageObserver.unobserve(img);
                    }
                }
            });
        });

        const lazyImages = document.querySelectorAll('img[data-src]');
        if (lazyImages && lazyImages.length > 0) {
            lazyImages.forEach(img => {
                if (img) imageObserver.observe(img);
            });
        }
    }

    // ============================================
    // SMOOTH REVEAL ANIMATIONS
    // ============================================
    if ('IntersectionObserver' in window) {
        var revealLoaded = false;
        const revealElements = document.querySelectorAll('.about-content, .referral-content, .contact-content');
        const revealObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && entry.target) {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translate3d(0, 0, 0)';
                    revealObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.2 });
        
        function initReveal() {
            if (revealLoaded) return;
            revealLoaded = true;
            if (revealElements && revealElements.length > 0) {
                revealElements.forEach(el => {
                    if (el) {
                        el.style.opacity = '0';
                        el.style.transform = 'translate3d(0, 30px, 0)';
                        el.style.transition = 'opacity 0.8s ease, transform 0.8s ease';
                        el.style.willChange = 'opacity, transform';
                        revealObserver.observe(el);
                    }
                });
            }
        }
        
        window.addEventListener('scroll', initReveal, { once: true, passive: true });
        setTimeout(initReveal, 2000);
    }

    // ============================================
    // TEAM CAROUSEL FUNCTIONALITY
    // ============================================
    let currentTeamIndex = 0;
    const teamMembers = document.querySelectorAll('.team-member');
    const teamDots = document.querySelectorAll('.dot');
    const teamPrevBtn = document.getElementById('teamPrevBtn');
    const teamNextBtn = document.getElementById('teamNextBtn');
    const teamCarousel = document.getElementById('teamCarousel');

    function showTeamMember(index) {
        // Remove active class from all members and dots
        if (teamMembers && teamMembers.length > 0) {
            teamMembers.forEach(member => {
                if (member) member.classList.remove('active');
            });
        }
        if (teamDots && teamDots.length > 0) {
            teamDots.forEach(dot => {
                if (dot) dot.classList.remove('active');
            });
        }
        
        // Add active class to current member and dot
        if (teamMembers && teamMembers[index]) {
            teamMembers[index].classList.add('active');
        }
        if (teamDots && teamDots[index]) {
            teamDots[index].classList.add('active');
        }
    }

    function nextTeamMember() {
        if (teamMembers && teamMembers.length > 0) {
            currentTeamIndex = (currentTeamIndex + 1) % teamMembers.length;
            showTeamMember(currentTeamIndex);
        }
    }

    function prevTeamMember() {
        if (teamMembers && teamMembers.length > 0) {
            currentTeamIndex = (currentTeamIndex - 1 + teamMembers.length) % teamMembers.length;
            showTeamMember(currentTeamIndex);
        }
    }

    // Event listeners for carousel buttons
    if (teamPrevBtn) {
        teamPrevBtn.addEventListener('click', prevTeamMember);
    }

    if (teamNextBtn) {
        teamNextBtn.addEventListener('click', nextTeamMember);
    }

    // Event listeners for dots
    if (teamDots && teamDots.length > 0) {
        teamDots.forEach((dot, index) => {
            if (dot) {
                dot.addEventListener('click', () => {
                    currentTeamIndex = index;
                    showTeamMember(currentTeamIndex);
                });
            }
        });
    }

    // Touch/swipe support for mobile
    let touchStartX = 0;
    let touchEndX = 0;

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
            nextTeamMember();
        }
        if (touchEndX > touchStartX + 50) {
            prevTeamMember();
        }
    }

    // ============================================
    // DEEPIKA IMAGE OPTIMIZATION
    // ============================================
    const deepikaImg = document.getElementById('deepikaImage');
    if (deepikaImg && !deepikaImg.complete) {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.as = 'image';
        link.href = 'deepika.png';
        document.head.appendChild(link);
    }

    // ============================================
    // VIDEO PLAYBACK FIX (DESKTOP + MOBILE)
    // ============================================
    const videos = document.querySelectorAll('video');
    
    if (videos && videos.length > 0) {
        videos.forEach(video => {
            if (!video) return;
            
            // Set iOS-specific attributes
            video.setAttribute('playsinline', 'true');
            video.setAttribute('webkit-playsinline', 'true');
            
            // Play video on tap or click
            video.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                if (video.paused) {
                    video.play().catch(function(error) {
                        // Silently handle autoplay restrictions
                    });
                } else {
                    video.pause();
                }
            }, { passive: false });
            
            // For mobile touch devices
            video.addEventListener('touchstart', function(e) {
                // Allow native video controls to work
            }, { passive: true });
            
            // Ensure video container doesn't block clicks
            const videoContainer = video.closest('.video-container');
            if (videoContainer) {
                videoContainer.style.pointerEvents = 'auto';
                videoContainer.addEventListener('click', function(e) {
                    if (e.target === videoContainer || e.target === video) {
                        if (video.paused) {
                            video.play().catch(function() {});
                        }
                    }
                });
            }
        });
    }

}); // End of DOMContentLoaded
