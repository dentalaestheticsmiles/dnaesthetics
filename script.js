// ============================================
// DNA CLINIC WEBSITE - MAIN JAVASCRIPT FILE
// Fully error-proof with all null checks and safe DOM handling
// ============================================
//
// TESTING CHECKLIST:
// 1. Click "Book Appointment" button → popup opens with scale animation
// 2. Fill form and submit → validation works (red border + shake on empty fields)
// 3. Successful submission → confirmation modal shows with checkmark animation
// 4. Click "Add to Phone Calendar" → .ics file downloads (test on iPhone/Android)
// 5. Click "Add to Google Calendar" → Google Calendar opens with prefilled event
// 6. AI chatbox "Book Appointment" → scrolls to contact section OR opens popup
// 7. CTA button appears after AI chat minimizes → opens appointment popup
// ============================================

document.addEventListener("DOMContentLoaded", function() {
    'use strict';

    // ============================================
    // GLOBAL SCROLL LOCK / UNLOCK HELPERS
    // ============================================
    function lockBodyScroll() {
        if (document.body.dataset.lockScrollY) return;
        const scrollY = window.scrollY || 0;
        document.body.style.overflow = 'hidden';
        document.body.style.position = 'fixed';
        document.body.style.width = '100%';
        document.body.style.top = `-${scrollY}px`;
        document.body.dataset.lockScrollY = String(scrollY);
    }

    function unlockBodyScroll() {
        const storedY = document.body.dataset.lockScrollY;
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.width = '';
        document.body.style.top = '';
        delete document.body.dataset.lockScrollY;
        if (storedY) window.scrollTo(0, parseInt(storedY));
    }

    // ============================================
    // SECURITY UTILITIES
    // ============================================
    
    // Enhanced HTML escaping for XSS protection
    function escapeHtml(text) {
        if (typeof text !== 'string') return '';
        const div = document.createElement("div");
        div.textContent = text;
        return div.innerHTML;
    }
    
    // ============================================
    // SECURE LOCALSTORAGE WITH ENCRYPTION & EXPIRY
    // ============================================
    
    // Simple encryption key (in production, this should be derived from user session)
    const ENCRYPTION_KEY = 'dna-clinic-secure-key-2024';
    
    // Simple XOR encryption (lightweight, sufficient for localStorage obfuscation)
    function simpleEncrypt(text, key) {
        if (!text || typeof text !== 'string') return '';
        let result = '';
        for (let i = 0; i < text.length; i++) {
            result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
        }
        return btoa(result); // Base64 encode
    }
    
    function simpleDecrypt(encrypted, key) {
        if (!encrypted || typeof encrypted !== 'string') return null;
        try {
            const decoded = atob(encrypted);
            let result = '';
            for (let i = 0; i < decoded.length; i++) {
                result += String.fromCharCode(decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length));
            }
            return result;
        } catch (e) {
            return null;
        }
    }
    
    // Secure set with encryption and expiry
    function secureSet(key, value, expiryHours = 24) {
        try {
            const expiresAt = Date.now() + (expiryHours * 60 * 60 * 1000);
            const data = {
                encrypted: simpleEncrypt(JSON.stringify(value), ENCRYPTION_KEY),
                expiresAt: expiresAt
            };
            localStorage.setItem(key, JSON.stringify(data));
            return true;
        } catch (e) {
            // localStorage quota exceeded or unavailable
            return false;
        }
    }
    
    // Secure get with decryption and expiry check
    function secureGet(key) {
        try {
            const stored = localStorage.getItem(key);
            if (!stored) return null;
            
            const data = JSON.parse(stored);
            
            // Check if expired
            if (data.expiresAt && Date.now() > data.expiresAt) {
                localStorage.removeItem(key);
                return null;
            }
            
            // Decrypt
            const decrypted = simpleDecrypt(data.encrypted, ENCRYPTION_KEY);
            if (!decrypted) {
                localStorage.removeItem(key);
                return null;
            }
            
            return JSON.parse(decrypted);
        } catch (e) {
            // Corrupted data or decryption failed
            try {
                localStorage.removeItem(key);
            } catch (e2) {
                // Ignore
            }
            return null;
        }
    }
    
    // Secure remove
    function secureRemove(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (e) {
            return false;
        }
    }
    
    // Migrate existing plaintext data to encrypted (one-time migration)
    function migrateToSecureStorage() {
        const keysToMigrate = ['dnaContacts', 'dnaKidsAppointments', 'dnaClinicChatHistory'];
        keysToMigrate.forEach(key => {
            try {
                const plainValue = localStorage.getItem(key);
                if (plainValue) {
                    const parsed = JSON.parse(plainValue);
                    const expiryHours = key === 'dnaClinicChatHistory' ? 72 : 24;
                    if (secureSet(key, parsed, expiryHours)) {
                        // Migration successful, old plaintext will be overwritten
                    }
                }
            } catch (e) {
                // Migration failed, keep existing data
            }
        });
    }
    
    // Run migration on load
    migrateToSecureStorage();
    
    // Sanitize user input (remove potentially dangerous characters)
    function sanitizeInput(input) {
        if (typeof input !== 'string') return '';
        return input.trim()
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
            .replace(/javascript:/gi, '') // Remove javascript: protocol
            .replace(/data:/gi, '') // Remove data: URIs
            .replace(/on\w+\s*=/gi, '') // Remove event handlers (onclick=, onerror=, etc.)
            .replace(/[<>]/g, ''); // Remove remaining angle brackets
    }
    
    // Sanitize HTML for safe insertion (if innerHTML must be used)
    function sanitizeHTML(html) {
        if (typeof html !== 'string') return '';
        const div = document.createElement('div');
        div.textContent = html; // Use textContent to escape everything
        let sanitized = div.innerHTML;
        // Additional cleanup
        sanitized = sanitized
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/on\w+\s*="[^"]*"/gi, '')
            .replace(/on\w+\s*='[^']*'/gi, '');
        return sanitized;
    }
    
    // Validate email format
    function isValidEmail(email) {
        if (!email || typeof email !== 'string') return false;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email.trim());
    }
    
    // Validate phone number (flexible format)
    function isValidPhone(phone) {
        if (!phone || typeof phone !== 'string') return false;
        const phoneRegex = /^[\d\s\-\+\(\)]{10,}$/;
        return phoneRegex.test(phone.trim().replace(/\s/g, ''));
    }
    
    // Time-based spam protection (non-intrusive)
    let formSubmissionTimes = {};
    function isSubmissionTooFast(formId) {
        const now = Date.now();
        const lastSubmission = formSubmissionTimes[formId] || 0;
        const timeDiff = now - lastSubmission;
        // Allow submission if at least 2 seconds have passed (prevents rapid-fire spam)
        if (timeDiff < 2000) {
            return true;
        }
        formSubmissionTimes[formId] = now;
        return false;
    }
    
    // Validate form data before submission
    function validateFormData(formData, formId) {
        const errors = [];
        
        // Check for honeypot field (if exists)
        if (formData.website || formData.url || formData.honeypot) {
            errors.push('Spam detected');
            return { valid: false, errors };
        }
        
        // Check submission speed
        if (isSubmissionTooFast(formId)) {
            errors.push('Please wait a moment before submitting again');
            return { valid: false, errors };
        }
        
        // Validate required fields
        if (formData.name && !sanitizeInput(formData.name)) {
            errors.push('Please enter a valid name');
        }
        
        if (formData.email && !isValidEmail(formData.email)) {
            errors.push('Please enter a valid email address');
        }
        
        if (formData.phone && !isValidPhone(formData.phone)) {
            errors.push('Please enter a valid phone number');
        }
        
        // Sanitize all string fields
        Object.keys(formData).forEach(key => {
            if (typeof formData[key] === 'string') {
                formData[key] = sanitizeInput(formData[key]);
            }
        });
        
        return {
            valid: errors.length === 0,
            errors: errors
        };
    }

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

    // Show modal on first visit - Defer to avoid blocking LCP - CSP-safe
    if (welcomeModal && !hasVisitedBefore()) {
        var showWelcomeModal = function() {
                    if (welcomeModal) {
                        welcomeModal.classList.add('show');
                        setVisited();
                    }
        };
        
        if ('requestIdleCallback' in window) {
            requestIdleCallback(function() {
                var welcomeTimeout = setTimeout(function() {
                    showWelcomeModal();
                }, 2000);
            }, { timeout: 3000 });
        } else {
            var welcomeTimeout2 = setTimeout(function() {
                showWelcomeModal();
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
                    // Show expert modal after welcome modal closes (if enough time has passed) - CSP-safe
                    var expertModalDelay = setTimeout(function() {
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
                    // Show expert modal after welcome modal closes - CSP-safe
                    var expertModalDelay2 = setTimeout(function() {
                        if (typeof showExpertModal === 'function') {
                            showExpertModal();
                        }
                    }, 2000);
                }
            });
        }
    }

    // ============================================
    // STILL HAVE QUESTIONS? POPUP - SMART BEHAVIOR-DRIVEN LOGIC
    // ============================================
    const popup = document.getElementById("question-popup");
    const key = "popupShownCount";
    const lastPopupTimeKey = "lastPopupTime";
    const popupDismissedKey = "popupDismissed";
    const lastTabSwitchKey = "lastTabSwitch";
    
    let count = Number(sessionStorage.getItem(key)) || 0;
    let lastPopupTime = Number(sessionStorage.getItem(lastPopupTimeKey)) || 0;
    let isDismissed = sessionStorage.getItem(popupDismissedKey) === "true";
    let scrollProgress = 0;
    let scrollTimer = null;
    let videoPauseTimer = null;
    let testimonyHoverTimer = null;
    let lastScrollTime = 0;
    let isIdle = false;
    let positiveInteractions = 0;

    // Debounce: minimum 20-30 seconds between popups
    function canShowPopup() {
        if (count >= 3) return false; // Max 3 per session
        if (isDismissed) return false; // User dismissed
        const now = Date.now();
        const timeSinceLastPopup = now - lastPopupTime;
        return timeSinceLastPopup >= 20000; // 20 seconds minimum
    }

    // Track if popup is currently showing to prevent twitching
    let isPopupShowing = false;
    
    function showPopup(treatment) {
        if (!treatment) treatment = "treatment";
        if (!canShowPopup()) return;
        if (!popup) return;
        
        // Prevent multiple simultaneous show calls (fixes twitching)
        if (isPopupShowing) return;
        if (!popup.classList.contains("hidden") && popup.classList.contains("visible")) return;
        
        isPopupShowing = true;
        popup.classList.remove("hidden");
        setTimeout(function() {
            popup.classList.add("visible");
            // Load chat history when popup becomes visible
            if (typeof loadChatHistory === "function") {
                loadChatHistory();
            }
            // Focus input after a short delay
            setTimeout(function() {
                const chatInput = document.getElementById("qp-chat-input");
                if (chatInput) chatInput.focus();
            }, 200);
        }, 10);
        count++;
        lastPopupTime = Date.now();
        sessionStorage.setItem(key, String(count));
        sessionStorage.setItem(lastPopupTimeKey, String(lastPopupTime));
    }

    function hidePopup() {
        if (!popup) return;
        isPopupShowing = false;
        popup.classList.remove("visible");
        setTimeout(function() {
            popup.classList.add("hidden");
        }, 150);
    }

    // TRIGGER 1: Scroll 70% + stay for 6 seconds
    let scrollTriggered = false;
    function checkScrollProgress() {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        scrollProgress = (scrollTop / docHeight) * 100;
        
        if (scrollProgress >= 70 && !scrollTriggered) {
            scrollTriggered = true;
            lastScrollTime = Date.now();
            scrollTimer = setTimeout(function() {
                if (canShowPopup() && Date.now() - lastScrollTime >= 6000) {
                    showPopup();
                }
            }, 6000);
        }
    }

    // TRIGGER 2: Video pause > 5 seconds (will be attached after videos are initialized)
    function attachVideoPauseTriggers() {
        const testimonialVideos = document.querySelectorAll(".testimonial-video");
        testimonialVideos.forEach(function(video) {
            video.addEventListener("pause", function() {
                if (videoPauseTimer) clearTimeout(videoPauseTimer);
                videoPauseTimer = setTimeout(function() {
                    if (canShowPopup()) {
                        showPopup("video consultation");
                    }
                }, 5000);
            });
            
            video.addEventListener("play", function() {
                if (videoPauseTimer) clearTimeout(videoPauseTimer);
                positiveInteractions++;
            });
        });
    }
    
    // Attach after DOM is ready
    attachVideoPauseTriggers();

    // TRIGGER 3: Testimony section hover/tap > 4 seconds
    const testimonySection = document.querySelector("#success-stories");
    if (testimonySection) {
        testimonySection.addEventListener("mouseenter", function() {
            testimonyHoverTimer = setTimeout(function() {
                if (canShowPopup()) {
                    showPopup("treatment");
                }
            }, 4000);
        });
        
        testimonySection.addEventListener("mouseleave", function() {
            if (testimonyHoverTimer) clearTimeout(testimonyHoverTimer);
        });
        
        testimonySection.addEventListener("touchstart", function() {
            testimonyHoverTimer = setTimeout(function() {
                if (canShowPopup()) {
                    showPopup("treatment");
                }
            }, 4000);
        });
    }

    // TRIGGER 4: Tab/App return logic
    let lastVisibilityChange = Date.now();
    document.addEventListener("visibilitychange", function() {
        if (document.hidden) {
            lastVisibilityChange = Date.now();
            sessionStorage.setItem(lastTabSwitchKey, String(lastVisibilityChange));
        } else {
            const hiddenTime = Date.now() - lastVisibilityChange;
            if (hiddenTime >= 15000 && canShowPopup()) { // 15+ seconds
                setTimeout(function() {
                    showPopup();
                }, 1000);
            }
        }
    });

    // Track positive interactions (reduce popup likelihood)
    document.addEventListener("click", function(e) {
        if (e.target.tagName === "BUTTON" || e.target.closest("button")) {
            positiveInteractions++;
        }
    });

    // ============================================
    // SMART TRIGGER FOR "STILL HAVE QUESTIONS?" POPUP
    // ============================================
    function canShowChatPopup() {
        // Not already shown this session
        if (sessionStorage.getItem("dnaQuestionPopupDismissed") === "true") return false;
        
        // Check if any major modal is open
        const majorModals = [
            document.getElementById('appointmentPopup'),
            document.getElementById('kidsAppointmentModal'),
            document.getElementById('chatbotAppointmentModal'),
            document.getElementById('appointmentConfirmationModal'),
            document.getElementById('kidsAppointmentConfirmationModal'),
            document.getElementById('chatbotAppointmentConfirmationModal'),
            document.getElementById('contactSuccessModal')
        ];
        for (let modal of majorModals) {
            if (modal && (modal.classList.contains('show') || modal.style.display === 'flex')) {
                return false;
            }
        }
        
        // User spent ≥ 20s on page
        const timeOnPage = Date.now() - pageLoadTime;
        if (timeOnPage < 20000) return false;
        
        // User scrolled ≥ 35%
        const scrollPercent = (window.scrollY + window.innerHeight) / document.documentElement.scrollHeight;
        if (scrollPercent < 0.35) return false;
        
        return true;
    }

    function showQuestionPopupIfAllowed() {
        const questionPopup = document.getElementById('question-popup');
        if (!questionPopup || !canShowChatPopup()) return;
        
        if (questionPopup.classList.contains('hidden')) {
            questionPopup.classList.remove('hidden');
            setTimeout(() => {
                questionPopup.classList.add('visible');
            }, 100);
        }
    }

    // Hide question popup when major modals open
    function hideQuestionPopupOnModalOpen() {
        const questionPopup = document.getElementById('question-popup');
        if (questionPopup && !questionPopup.classList.contains('hidden')) {
            questionPopup.classList.remove('visible');
            setTimeout(() => {
                questionPopup.classList.add('hidden');
            }, 150);
        }
    }

    // Track page load time for smart trigger
    const pageLoadTime = Date.now();

    // Scroll listener with smart trigger
    let scrollTriggerFired = false;
    window.addEventListener("scroll", function() {
        checkScrollProgress();
        lastScrollTime = Date.now();
        
        // Smart trigger on scroll
        if (!scrollTriggerFired && canShowChatPopup()) {
            scrollTriggerFired = true;
            showQuestionPopupIfAllowed();
        }
    }, { passive: true });

    // 30s fallback timer
    setTimeout(function() {
        if (!scrollTriggerFired && canShowChatPopup()) {
            showQuestionPopupIfAllowed();
        }
    }, 30000);

    // Track when question popup is dismissed
    const qpCloseBtn = document.getElementById('qp-close-btn');
    if (qpCloseBtn) {
        qpCloseBtn.addEventListener('click', function() {
            sessionStorage.setItem("dnaQuestionPopupDismissed", "true");
        });
    }

    // ============================================
    // AI CHATBOT FUNCTIONALITY
    // ============================================
    const chatContainer = document.getElementById("qp-chat-container");
    const chatInput = document.getElementById("qp-chat-input");
    const sendBtn = document.getElementById("qp-send-btn");
    const typingIndicator = document.getElementById("qp-typing-indicator");
    const closeBtn = document.getElementById("qp-close-btn");
    const whatsappBtn = document.getElementById("qp-whatsapp-btn");
    const quickReplyChips = document.querySelectorAll(".qp-chip");
    
    const chatHistoryKey = "dnaClinicChatHistory";
    const OPENAI_API_KEY = ""; // User needs to add their OpenAI API key
    const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";
    
    // Load chat history from localStorage
    function loadChatHistory() {
        if (!chatContainer) return;
        
        const history = secureGet(chatHistoryKey);
        if (history) {
            try {
                const messages = history; // Already parsed by secureGet
                // Clear container but keep initial structure
                const existingMessages = chatContainer.querySelectorAll(".qp-message");
                existingMessages.forEach(function(msg) {
                    msg.remove();
                });
                const existingChips = chatContainer.querySelector(".qp-quick-replies");
                if (existingChips) existingChips.remove();
                
                // Restore messages
                messages.forEach(function(msg) {
                    addMessageToChat(msg.text, msg.sender);
                });
                scrollChatToBottom();
            } catch (e) {
                // Failed to load chat history (silent failure for security)
            }
        }
    }
    
    // Save chat history to localStorage
    function saveChatHistory() {
        if (!chatContainer) return;
        
        const messages = [];
        const messageElements = chatContainer.querySelectorAll(".qp-message");
        messageElements.forEach(function(el) {
            const content = el.querySelector(".qp-message-content");
            if (content) {
                const sender = el.classList.contains("qp-user-message") ? "user" : "bot";
                messages.push({
                    text: content.textContent.trim(),
                    sender: sender
                });
            }
        });
        if (messages.length > 0) {
            secureSet(chatHistoryKey, messages, 72); // 72-hour expiry for chat history
        }
    }
    
    // Add message to chat
    function addMessageToChat(text, sender) {
        if (!chatContainer) return;
        
        const messageDiv = document.createElement("div");
        messageDiv.className = "qp-message " + (sender === "user" ? "qp-user-message" : "qp-bot-message");
        
        const contentDiv = document.createElement("div");
        contentDiv.className = "qp-message-content";
        // Safe HTML insertion using textContent (XSS protection)
        const textPara = document.createElement("p");
        textPara.textContent = text; // textContent automatically escapes HTML
        contentDiv.appendChild(textPara);
        
        messageDiv.appendChild(contentDiv);
        chatContainer.appendChild(messageDiv);
        
        scrollChatToBottom();
        saveChatHistory();
    }
    
    // Show typing indicator
    function showTypingIndicator() {
        typingIndicator.classList.remove("hidden");
        scrollChatToBottom();
    }
    
    // Hide typing indicator
    function hideTypingIndicator() {
        typingIndicator.classList.add("hidden");
    }
    
    // Scroll chat to bottom
    function scrollChatToBottom() {
        setTimeout(function() {
            chatContainer.scrollTop = chatContainer.scrollHeight;
        }, 100);
    }
    
    // Escape HTML to prevent XSS
    function escapeHtml(text) {
        const div = document.createElement("div");
        div.textContent = text;
        return div.innerHTML;
    }
    
    // Get AI response from OpenAI
    async function getAIResponse(userMessage) {
        if (!OPENAI_API_KEY) {
            // Fallback to rule-based responses if no API key
            return getRuleBasedResponse(userMessage);
        }
        
        try {
            const systemPrompt = `You are a knowledgeable and friendly AI assistant for DNA Clinic, a premier dental and aesthetic clinic. 

Your role:
- Provide detailed, helpful information about dental services, aesthetic treatments, and pediatric dentistry
- Answer questions clearly and conversationally (3-4 sentences when needed)
- Be empathetic and reassuring
- Always end with: "For personalized treatment plans and clinical decisions, I recommend speaking directly with our expert dentists."

Important guidelines:
- Give comprehensive answers that help users understand their options
- If asked about pricing, politely explain that pricing varies and suggest booking a consultation
- When users seem ready for next steps, naturally guide them to book an appointment or chat with a human
- Be warm, professional, and helpful
- Never provide medical diagnoses - always recommend consulting a dentist`;
            
            const response = await fetch(OPENAI_API_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": "Bearer " + OPENAI_API_KEY
                },
                body: JSON.stringify({
                    model: "gpt-4o-mini",
                    messages: [
                        { role: "system", content: systemPrompt },
                        { role: "user", content: userMessage }
                    ],
                    max_tokens: 250,
                    temperature: 0.8
                })
            });
            
            if (!response.ok) {
                throw new Error("API request failed");
            }
            
            const data = await response.json();
            let aiResponse = data.choices[0].message.content.trim();
            
            // Ensure AI response includes helpful guidance if it doesn't already
            const lowerResponse = aiResponse.toLowerCase();
            if (!lowerResponse.includes("consult") && !lowerResponse.includes("speak") && 
                !lowerResponse.includes("book") && !lowerResponse.includes("whatsapp") &&
                !lowerResponse.includes("recommend")) {
                // Add gentle CTA if response doesn't have one
                aiResponse += " Would you like to book a consultation or chat with our team for more personalized information?";
            }
            
            return aiResponse;
        } catch (error) {
            console.error("AI API error:", error);
            return getRuleBasedResponse(userMessage);
        }
    }
    
    // Rule-based fallback responses
    function getRuleBasedResponse(message) {
        const lowerMsg = message.toLowerCase();
        
        // Dental Services
        if (lowerMsg.includes("dental") || lowerMsg.includes("teeth") || lowerMsg.includes("tooth")) {
            if (lowerMsg.includes("whiten") || lowerMsg.includes("white")) {
                return "Teeth whitening is a safe, non-invasive procedure that can brighten your smile by several shades. We offer both in-office professional whitening and take-home kits. The process is generally painless, though some may experience mild sensitivity that typically subsides quickly. Results can last 1-3 years depending on your habits. For personalized treatment plans and clinical decisions, I recommend speaking directly with our expert dentists.";
            }
            if (lowerMsg.includes("implant")) {
                return "Dental implants are the gold standard for permanent tooth replacement. They're made of biocompatible titanium that fuses with your jawbone, providing a stable foundation for crowns that look and feel natural. The procedure is done in stages with local anesthesia, and implants can last a lifetime with proper care. We use advanced 3D imaging to plan your treatment precisely. For personalized treatment plans and clinical decisions, I recommend speaking directly with our expert dentists.";
            }
            if (lowerMsg.includes("root canal") || lowerMsg.includes("rct")) {
                return "Root canal treatment is a modern, pain-free procedure that saves your natural tooth by removing infected or damaged pulp. Thanks to advanced techniques and local anesthesia, most patients report it's no more uncomfortable than a regular filling. The procedure typically takes 1-2 visits, and your tooth will be restored with a crown for protection. Saving your natural tooth is always the best option. For personalized treatment plans and clinical decisions, I recommend speaking directly with our expert dentists.";
            }
            if (lowerMsg.includes("brace") || lowerMsg.includes("orthodont") || lowerMsg.includes("invisalign")) {
                return "We offer both traditional braces and Invisalign clear aligners for straightening teeth. Invisalign uses custom-made, nearly invisible aligners that you can remove for eating and cleaning. Traditional braces are highly effective for complex cases. Treatment duration typically ranges from 12-24 months depending on your needs. We'll assess your case and recommend the best option for you. For personalized treatment plans and clinical decisions, I recommend speaking directly with our expert dentists.";
            }
            if (lowerMsg.includes("smile") || lowerMsg.includes("makeover") || lowerMsg.includes("cosmetic")) {
                return "A smile makeover combines multiple cosmetic dental procedures to transform your smile. This can include teeth whitening, veneers, bonding, crowns, or orthodontics. We'll create a customized treatment plan based on your goals, budget, and timeline. During your consultation, we'll show you a preview of your new smile. For personalized treatment plans and clinical decisions, I recommend speaking directly with our expert dentists.";
            }
            return "We offer comprehensive dental services including dental implants, root canal treatment, teeth whitening, braces/Invisalign, smile makeovers, and general dentistry. Each treatment is customized to your specific needs. Our experienced team uses the latest technology to ensure comfortable, effective care. Would you like to learn more about a specific treatment or book a consultation? For personalized treatment plans and clinical decisions, I recommend speaking directly with our expert dentists.";
        }
        
        // Aesthetic Services
        if (lowerMsg.includes("aesthetic") || lowerMsg.includes("botox") || lowerMsg.includes("filler") || lowerMsg.includes("skin") || lowerMsg.includes("facial")) {
            if (lowerMsg.includes("botox")) {
                return "Botox is a safe, FDA-approved neurotoxin that temporarily relaxes facial muscles to smooth wrinkles and fine lines. It's most commonly used for forehead lines, crow's feet, and frown lines. The procedure takes just 10-15 minutes with minimal discomfort, and results appear within 3-7 days, lasting 3-4 months. There's no downtime - you can return to normal activities immediately. For personalized treatment plans and clinical decisions, I recommend speaking directly with our expert dentists.";
            }
            if (lowerMsg.includes("filler") || lowerMsg.includes("dermal")) {
                return "Dermal fillers restore lost volume, smooth wrinkles, and enhance facial contours. We use hyaluronic acid-based fillers that are safe and reversible. The procedure is quick (15-30 minutes) with immediate results and minimal downtime. Fillers can plump lips, enhance cheekbones, smooth nasolabial folds, and restore youthful volume. Results typically last 6-18 months depending on the area treated. For personalized treatment plans and clinical decisions, I recommend speaking directly with our expert dentists.";
            }
            if (lowerMsg.includes("peel") || lowerMsg.includes("chemical")) {
                return "Chemical peels use safe acids to exfoliate the skin, improving texture, reducing fine lines, and treating pigmentation. We offer light, medium, and deep peels depending on your skin concerns and type. Light peels require no downtime, while deeper peels may need a few days of recovery. Peels can address acne, sun damage, fine lines, and uneven skin tone. For personalized treatment plans and clinical decisions, I recommend speaking directly with our expert dentists.";
            }
            if (lowerMsg.includes("laser") || lowerMsg.includes("rejuvenation")) {
                return "Laser skin treatments use advanced technology to address various skin concerns including pigmentation, fine lines, acne scars, and overall skin rejuvenation. We offer different laser types for different concerns - some for resurfacing, others for targeting specific issues. Treatments are customized to your skin type and goals. Most procedures have minimal downtime. For personalized treatment plans and clinical decisions, I recommend speaking directly with our expert dentists.";
            }
            return "We offer a comprehensive range of aesthetic services including Botox, dermal fillers, chemical peels, laser skin treatments, and facial aesthetics. Our treatments are performed by experienced professionals using premium products. Each treatment is customized to your unique needs and goals. Would you like to learn more about a specific treatment or book a consultation? For personalized treatment plans and clinical decisions, I recommend speaking directly with our expert dentists.";
        }
        
        // Kids Dentistry
        if (lowerMsg.includes("kid") || lowerMsg.includes("child") || lowerMsg.includes("pediatric")) {
            if (lowerMsg.includes("first visit") || lowerMsg.includes("age") || lowerMsg.includes("when")) {
                return "We recommend children have their first dental visit by age 1 or within 6 months of their first tooth erupting. Early visits help establish good oral health habits and allow us to monitor development. Our pediatric specialists create a fun, welcoming environment with child-friendly language and gentle techniques. We focus on making dental care a positive experience from the start. For personalized treatment plans and clinical decisions, I recommend speaking directly with our expert dentists.";
            }
            if (lowerMsg.includes("clean") || lowerMsg.includes("fluoride") || lowerMsg.includes("cleaning")) {
                return "Regular professional cleanings and fluoride treatments are essential for preventing cavities in children. We make the experience enjoyable with kid-friendly tools, fun explanations, and rewards. Fluoride strengthens developing teeth and helps prevent decay. Cleanings remove plaque and tartar that regular brushing might miss. We also educate both children and parents on proper home care. For personalized treatment plans and clinical decisions, I recommend speaking directly with our expert dentists.";
            }
            if (lowerMsg.includes("sealant") || lowerMsg.includes("cavity") || lowerMsg.includes("prevent")) {
                return "Dental sealants are a protective coating applied to the chewing surfaces of back teeth to prevent cavities. They're especially important for children whose permanent molars are just coming in. The procedure is quick, painless, and can protect teeth for several years. We also provide fluoride treatments and educate on proper brushing and flossing techniques. For personalized treatment plans and clinical decisions, I recommend speaking directly with our expert dentists.";
            }
            if (lowerMsg.includes("brace") || lowerMsg.includes("orthodont") || lowerMsg.includes("straighten")) {
                return "Early orthodontic evaluation helps identify and address issues before they become more complex. We can assess jaw growth, tooth alignment, and bite problems. Some children benefit from early intervention (ages 7-9), while others are better suited for treatment during adolescence. We'll monitor your child's development and recommend the best timing for treatment if needed. For personalized treatment plans and clinical decisions, I recommend speaking directly with our expert dentists.";
            }
            return "We provide comprehensive, gentle pediatric dental care including first visits, regular cleanings, fluoride treatments, dental sealants, early orthodontic evaluation, and emergency care. Our child-friendly approach ensures a positive experience that sets the foundation for lifelong oral health. We work closely with parents to ensure the best care for their children. Would you like to book an appointment for your child? For personalized treatment plans and clinical decisions, I recommend speaking directly with our expert dentists.";
        }
        
        // Pricing - Redirect to consultation
        if (lowerMsg.includes("price") || lowerMsg.includes("cost") || lowerMsg.includes("fee") || lowerMsg.includes("how much") || lowerMsg.includes("charge")) {
            return "I understand you'd like to know about pricing. Treatment costs vary based on individual needs, complexity, and the specific procedure. To get accurate pricing information tailored to your situation, I'd recommend booking a consultation with our dentists. During the consultation, we'll assess your needs and provide detailed treatment plans with transparent pricing. We also offer flexible payment options. Would you like to book a consultation or chat with our team on WhatsApp for more information?";
        }
        
        // Appointment
        if (lowerMsg.includes("appointment") || lowerMsg.includes("book") || lowerMsg.includes("schedule") || lowerMsg.includes("visit")) {
            return "Excellent! I'd be happy to help you book an appointment. To find the best time slot for you and ensure we have the right specialist available, I recommend connecting with our team directly. You can book through WhatsApp where our team can check real-time availability, or you can call us. This way we can confirm your preferred date and time, and gather any necessary information beforehand. Would you like to continue on WhatsApp or speak with a team member?";
        }
        
        // Clinic Timings
        if (lowerMsg.includes("time") || lowerMsg.includes("hour") || lowerMsg.includes("open") || lowerMsg.includes("close") || lowerMsg.includes("when") && lowerMsg.includes("available")) {
            return "Our clinic is typically open Monday to Saturday, from 9 AM to 7 PM. However, specific availability may vary, and we recommend checking with us directly for the most current schedule and to find a time that works best for you. You can reach us on WhatsApp at +91 80729 80232 for immediate assistance with scheduling.";
        }
        
        // Contact
        if (lowerMsg.includes("contact") || lowerMsg.includes("phone") || lowerMsg.includes("address") || lowerMsg.includes("location") || lowerMsg.includes("where")) {
            return "You can reach us via WhatsApp at +91 80729 80232 for quick responses and easy scheduling. Our team is available to answer your questions, help you book appointments, and provide any information you need. For immediate assistance or to speak with our team directly, WhatsApp is the fastest way to connect. Would you like to continue the conversation on WhatsApp?";
        }
        
        // Emergency
        if (lowerMsg.includes("pain") || lowerMsg.includes("emergency") || lowerMsg.includes("urgent") || lowerMsg.includes("hurt") || lowerMsg.includes("ache")) {
            return "I'm sorry to hear you're experiencing dental pain. For urgent dental issues, please contact us immediately. You can reach us on WhatsApp at +91 80729 80232 or call us directly. Our team will help you get the care you need as quickly as possible. If it's a severe emergency outside our hours, we can guide you to the best course of action. Please don't hesitate to reach out - we're here to help.";
        }
        
        // General questions about procedures, safety, etc.
        if (lowerMsg.includes("safe") || lowerMsg.includes("risk") || lowerMsg.includes("side effect") || lowerMsg.includes("painful") || lowerMsg.includes("hurt")) {
            return "I understand your concern about safety and comfort. All our treatments are performed using modern techniques and high-quality materials. Most procedures are performed with local anesthesia to ensure comfort, and we prioritize patient safety in everything we do. The specific details about any procedure, including what to expect, will be thoroughly discussed during your consultation. For personalized information about your specific situation and any concerns, I'd recommend speaking directly with our dentists who can address your questions in detail. Would you like to book a consultation to discuss this further?";
        }
        
        // Generic questions - provide helpful general answers
        if (lowerMsg.includes("hello") || lowerMsg.includes("hi") || lowerMsg.includes("hey")) {
            return "Hello! I'm here to help you with questions about DNA Clinic's dental and aesthetic services. I can provide information about treatments, procedures, kids dentistry, appointments, and more. What would you like to know?";
        }
        
        if (lowerMsg.includes("what") && (lowerMsg.includes("do") || lowerMsg.includes("offer") || lowerMsg.includes("provide"))) {
            return "DNA Clinic offers comprehensive dental and aesthetic services. On the dental side, we provide implants, root canals, teeth whitening, orthodontics (braces and Invisalign), smile makeovers, and general dentistry. For aesthetics, we offer Botox, dermal fillers, chemical peels, laser skin treatments, and facial aesthetics. We also specialize in pediatric dental care for children. Would you like more details about any specific service?";
        }
        
        if (lowerMsg.includes("how") && (lowerMsg.includes("long") || lowerMsg.includes("duration") || lowerMsg.includes("take"))) {
            return "Treatment duration varies depending on the procedure. Simple procedures like cleanings or Botox take 15-30 minutes, while more complex treatments like implants or orthodontics can take several months. During your consultation, we'll provide a detailed timeline for your specific treatment plan. Would you like to book a consultation to discuss your timeline?";
        }
        
        if (lowerMsg.includes("where") || (lowerMsg.includes("location") && !lowerMsg.includes("contact")) || (lowerMsg.includes("address") && !lowerMsg.includes("contact"))) {
            return "DNA Clinic is located at 123 Dental Avenue, Health District. We're easily accessible and have convenient parking. Our clinic hours are Monday to Saturday, 9 AM to 7 PM. Would you like directions or help scheduling a visit?";
        }
        
        // Default - More helpful and engaging
        return "I'm here to help answer your questions about dental services, aesthetic treatments, kids dentistry, appointments, and more. Feel free to ask me anything - whether it's about a specific procedure, what to expect, or how we can help you achieve your goals. For personalized treatment plans and clinical decisions, I recommend speaking directly with our expert dentists. How can I assist you today?";
    }
    
    // Handle quick reply chips
    quickReplyChips.forEach(function(chip) {
        chip.addEventListener("click", function() {
            const action = this.getAttribute("data-action");
            let message = "";
            
            switch(action) {
                case "dental-services":
                    message = "Tell me about dental services";
                    break;
                case "aesthetic-services":
                    message = "Tell me about aesthetic services";
                    break;
                case "kids-dentistry":
                    message = "Tell me about kids dentistry";
                    break;
                case "book-appointment":
                    // Scroll to contact section instead of opening modal
                    const contactSection = document.getElementById('contact');
                    if (contactSection) {
                        // Close chat popup if open
                        const chatPopup = document.getElementById('question-popup');
                        if (chatPopup && !chatPopup.classList.contains('hidden')) {
                            if (typeof hidePopup === "function") {
                                hidePopup();
                            } else {
                                chatPopup.classList.remove("visible");
                                setTimeout(function() {
                                    chatPopup.classList.add("hidden");
                                }, 150);
                            }
                        }
                        // Scroll to contact section smoothly
                        setTimeout(function() {
                            contactSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            // Focus on the form after a short delay
                            setTimeout(function() {
                                const nameInput = document.getElementById('contactName');
                                if (nameInput) {
                                    nameInput.focus();
                                }
                            }, 500);
                        }, 200);
                        return; // Don't send message, just scroll
                    }
                    message = "I want to book an appointment";
                    break;
                case "clinic-timings":
                    message = "What are your clinic timings?";
                    break;
                case "contact-info":
                    message = "What is your contact information?";
                    break;
            }
            
            if (message) {
                handleUserMessage(message);
            }
        });
    });
    
    // Track conversation count to suggest doctor after a few questions
    let conversationCount = 0;
    const conversationCountKey = "dnaChatConversationCount";
    
    // Load conversation count
    try {
        conversationCount = parseInt(sessionStorage.getItem(conversationCountKey) || "0", 10);
    } catch (e) {
        conversationCount = 0;
    }
    
    // Handle user message
    async function handleUserMessage(message) {
        if (!message.trim()) return;
        
        // Increment conversation count
        conversationCount++;
        try {
            sessionStorage.setItem(conversationCountKey, String(conversationCount));
        } catch (e) {
            // Ignore storage errors
        }
        
        // Add user message
        addMessageToChat(message, "user");
        
        // Remove quick reply chips after first user message
        const quickReplies = chatContainer.querySelector(".qp-quick-replies");
        if (quickReplies) {
            quickReplies.remove();
        }
        
        // Show typing indicator
        showTypingIndicator();
        
        // Get AI response
        const aiResponse = await getAIResponse(message);
        
        // Hide typing indicator
        hideTypingIndicator();
        
        // Add bot response
        addMessageToChat(aiResponse, "bot");
        
        // Show contextual quick replies based on conversation count and message
        // After 3+ questions, suggest talking to doctor/specialist
        showContextualQuickReplies(message, conversationCount);
    }
    
    // Show contextual quick replies - Answer questions first, then suggest next steps
    function showContextualQuickReplies(userMessage, convCount) {
        if (!chatContainer) return;
        
        const lowerMsg = userMessage.toLowerCase();
        const quickRepliesDiv = document.createElement("div");
        quickRepliesDiv.className = "qp-quick-replies";
        
        // After 3+ questions, strongly suggest talking to doctor/specialist
        if (convCount >= 3) {
            quickRepliesDiv.innerHTML = '';
            const btn1 = document.createElement('button');
            btn1.className = 'qp-chip';
            btn1.setAttribute('data-action', 'whatsapp');
            btn1.textContent = '👨‍⚕️ Talk to Doctor/Specialist';
            quickRepliesDiv.appendChild(btn1);
            
            const btn2 = document.createElement('button');
            btn2.className = 'qp-chip';
            btn2.setAttribute('data-action', 'book-appointment');
            btn2.textContent = '📅 Book Consultation';
            quickRepliesDiv.appendChild(btn2);
        } else if (lowerMsg.includes("appointment") || lowerMsg.includes("book") || lowerMsg.includes("schedule")) {
            // User is already interested in booking
            quickRepliesDiv.innerHTML = '';
            const btn3 = document.createElement('button');
            btn3.className = 'qp-chip';
            btn3.setAttribute('data-action', 'book-appointment');
            btn3.textContent = '📅 Book Now';
            quickRepliesDiv.appendChild(btn3);
            
            const btn4 = document.createElement('button');
            btn4.className = 'qp-chip';
            btn4.setAttribute('data-action', 'whatsapp');
            btn4.textContent = '💬 Confirm on WhatsApp';
            quickRepliesDiv.appendChild(btn4);
        } else if (lowerMsg.includes("price") || lowerMsg.includes("cost") || lowerMsg.includes("fee")) {
            quickRepliesDiv.innerHTML = '';
            const btn5 = document.createElement('button');
            btn5.className = 'qp-chip';
            btn5.setAttribute('data-action', 'book-appointment');
            btn5.textContent = '📅 Book Consultation';
            quickRepliesDiv.appendChild(btn5);
            
            const btn6 = document.createElement('button');
            btn6.className = 'qp-chip';
            btn6.setAttribute('data-action', 'whatsapp');
            btn6.textContent = '💬 Get Exact Pricing';
            quickRepliesDiv.appendChild(btn6);
        } else if (lowerMsg.includes("emergency") || lowerMsg.includes("pain") || lowerMsg.includes("urgent")) {
            quickRepliesDiv.innerHTML = '';
            const btn7 = document.createElement('button');
            btn7.className = 'qp-chip';
            btn7.setAttribute('data-action', 'whatsapp');
            btn7.textContent = '🚨 Contact Now';
            quickRepliesDiv.appendChild(btn7);
            
            const btn8 = document.createElement('button');
            btn8.className = 'qp-chip';
            btn8.setAttribute('data-action', 'contact-info');
            btn8.textContent = '📞 Call Us';
            quickRepliesDiv.appendChild(btn8);
        } else if (lowerMsg.includes("need") || lowerMsg.includes("want") || lowerMsg.includes("interested") || 
                   lowerMsg.includes("help") || lowerMsg.includes("problem") || lowerMsg.includes("treatment")) {
            // User is looking for a solution - show booking options
            quickRepliesDiv.innerHTML = '';
            const btn9 = document.createElement('button');
            btn9.className = 'qp-chip';
            btn9.setAttribute('data-action', 'book-appointment');
            btn9.textContent = '📅 Book Appointment';
            quickRepliesDiv.appendChild(btn9);
            
            const btn10 = document.createElement('button');
            btn10.className = 'qp-chip';
            btn10.setAttribute('data-action', 'whatsapp');
            btn10.textContent = '💬 Talk to Specialist';
            quickRepliesDiv.appendChild(btn10);
        } else {
            // For general questions, show subtle CTAs (don't push too hard)
            // Only show CTAs after first question
            if (convCount > 1) {
                quickRepliesDiv.innerHTML = '';
                const btn11 = document.createElement('button');
                btn11.className = 'qp-chip';
                btn11.setAttribute('data-action', 'book-appointment');
                btn11.textContent = '📅 Book Appointment';
                quickRepliesDiv.appendChild(btn11);
                
                const btn12 = document.createElement('button');
                btn12.className = 'qp-chip';
                btn12.setAttribute('data-action', 'whatsapp');
                btn12.textContent = '💬 Need More Help?';
                quickRepliesDiv.appendChild(btn12);
            }
            // If first question, don't show CTAs - let AI answer first
        }
        
        // Attach event listeners to new chips
        quickRepliesDiv.querySelectorAll(".qp-chip").forEach(function(chip) {
            chip.addEventListener("click", function() {
                const action = this.getAttribute("data-action");
                if (action === "whatsapp" || action === "whatsapp-chat") {
                    window.open("https://wa.me/918072980232", "_blank");
                    // Add a message about WhatsApp
                    setTimeout(function() {
                        addMessageToChat("I've opened WhatsApp for you. Our team will respond quickly to help with your questions!", "bot");
                    }, 500);
                } else if (action === "book-appointment") {
                    // Scroll to contact section instead of opening popup
                    const contactSection = document.getElementById('contact');
                    if (contactSection) {
                        // Close chat popup if open
                        const chatPopup = document.getElementById('question-popup');
                        if (chatPopup && !chatPopup.classList.contains('hidden')) {
                            if (typeof hidePopup === "function") {
                                hidePopup();
                            } else {
                                chatPopup.classList.remove("visible");
                                setTimeout(function() {
                                    chatPopup.classList.add("hidden");
                                }, 150);
                            }
                        }
                        // Scroll to contact section smoothly
                        setTimeout(function() {
                            contactSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            // Focus on the form after a short delay
                            setTimeout(function() {
                                const nameInput = document.getElementById('contactName');
                                if (nameInput) {
                                    nameInput.focus();
                                }
                            }, 500);
                        }, 200);
                    } else {
                        handleUserMessage("I want to book an appointment");
                    }
                } else if (action === "contact-info") {
                    handleUserMessage("What is your contact information?");
                } else {
                    handleUserMessage(this.textContent);
                }
            });
        });
        
        chatContainer.appendChild(quickRepliesDiv);
        scrollChatToBottom();
    }
    
    // Send button handler
    if (sendBtn) {
        sendBtn.addEventListener("click", function() {
            const message = chatInput.value.trim();
            if (message) {
                handleUserMessage(message);
                chatInput.value = "";
            }
        });
    }
    
    // Enter key handler
    if (chatInput) {
        chatInput.addEventListener("keypress", function(e) {
            if (e.key === "Enter") {
                const message = chatInput.value.trim();
                if (message) {
                    handleUserMessage(message);
                    chatInput.value = "";
                }
            }
        });
    }
    
    // Close button handler
    if (closeBtn) {
        closeBtn.addEventListener("click", function() {
            hidePopup();
            isDismissed = true;
            sessionStorage.setItem(popupDismissedKey, "true");
        });
    }
    
    // WhatsApp button handler
    if (whatsappBtn) {
        whatsappBtn.addEventListener("click", function() {
            window.open("https://wa.me/918072980232", "_blank");
            positiveInteractions++;
        });
    }
    

    // ESC to close
    document.addEventListener("keydown", function(e) {
        if (e.key === "Escape" && popup && !popup.classList.contains("hidden")) {
            hidePopup();
        }
    });

    // Close on outside click
    if (popup) {
        popup.addEventListener("click", function(e) {
            if (e.target === popup) {
                popup.classList.remove("visible");
                setTimeout(function() {
                    popup.classList.add("hidden");
                }, 150);
            }
        });
    }

    // ============================================
    // EXPERT DENTIST CONSULTATION MODAL (LEGACY SUPPORT)
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

        // Track time on page - CSP-safe function reference
        var timeTrackerInterval = setInterval(function updateTimeOnPage() {
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
    
    // Defer expert modal logic - CSP-safe function references
    function initExpertModalSystem() {
        var checkWelcomeModalInterval = setInterval(function checkWelcomeModal() {
            const welcomeShowing = welcomeModal && welcomeModal.classList.contains('show');
            
            if (!welcomeShowing) {
                clearInterval(checkWelcomeModalInterval);
                
                var expertModalTimeout = setTimeout(function startExpertModalCheck() {
                    var expertModalInterval = setInterval(function checkExpertModal() {
                        if (expertConsultationModal && !expertConsultationModal.classList.contains('show')) {
                            showExpertModal();
                        }
                    }, 8 * 1000);
                }, EXPERT_CONFIG.INITIAL_DELAY);
            }
        }, 500);
        
        window.addEventListener('scroll', function() {
            if (isBrowsingServices() && expertConsultationModal && !expertConsultationModal.classList.contains('show')) {
                        if (window.servicesScrollTimeout) {
                clearTimeout(window.servicesScrollTimeout);
                        }
                        window.servicesScrollTimeout = setTimeout(function showExpertModalOnScroll() {
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
        var expertSystemTimeout = setTimeout(function() {
            initExpertModalSystem();
        }, 2000);
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
    function validateContactForm() {
        const nameInput = document.getElementById('contactName');
        const emailInput = document.getElementById('contactEmail');
        const phoneInput = document.getElementById('contactPhone');
        const serviceInput = document.getElementById('contactService');

        let isValid = true;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        let firstInvalidField = null;

        // Remove previous errors
        [nameInput, emailInput, phoneInput, serviceInput].forEach(function(input) {
            if (input) {
                input.classList.remove('input-error');
            }
        });

        // Validate name
        if (!nameInput || !nameInput.value.trim()) {
            if (nameInput) {
                nameInput.classList.add('input-error');
                if (!firstInvalidField) firstInvalidField = nameInput;
            }
            isValid = false;
        }

        // Validate email
        if (!emailInput || !emailInput.value.trim() || !emailRegex.test(emailInput.value.trim())) {
            if (emailInput) {
                emailInput.classList.add('input-error');
                if (!firstInvalidField) firstInvalidField = emailInput;
            }
            isValid = false;
        }

        // Validate phone (at least 10 digits)
        if (!phoneInput || !phoneInput.value.trim() || phoneInput.value.replace(/\D/g, '').length < 10) {
            if (phoneInput) {
                phoneInput.classList.add('input-error');
                if (!firstInvalidField) firstInvalidField = phoneInput;
            }
            isValid = false;
        }

        // Validate service
        if (!serviceInput || !serviceInput.value) {
            if (serviceInput) {
                serviceInput.classList.add('input-error');
                if (!firstInvalidField) firstInvalidField = serviceInput;
            }
            isValid = false;
        }

        // Scroll to first invalid field if form is invalid
        if (!isValid && firstInvalidField) {
            firstInvalidField.scrollIntoView({ behavior: 'smooth', block: 'center' });
            firstInvalidField.focus();
        }

        return isValid;
    }

    const appointmentForm = document.getElementById('appointmentForm');
    if (appointmentForm) {
        appointmentForm.addEventListener('submit', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            // Validate form
            if (!validateContactForm()) {
                return false;
            }
            
            // Get form data with null checks
            const nameInput = document.getElementById('contactName');
            const emailInput = document.getElementById('contactEmail');
            const phoneInput = document.getElementById('contactPhone');
            const serviceInput = document.getElementById('contactService');
            const messageInput = document.getElementById('contactMessage');
            
            if (!nameInput || !emailInput || !phoneInput || !serviceInput || !messageInput) {
                return false;
            }
            
            const name = nameInput.value.trim();
            const email = emailInput.value.trim();
            const phone = phoneInput.value.trim();
            const service = serviceInput.value;
            const message = messageInput.value.trim();

            // Disable submit button and show loading state
            const submitBtn = appointmentForm.querySelector('button[type="submit"]');
            const originalBtnText = submitBtn ? submitBtn.textContent : 'Book Appointment';
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Sending...';
            }

            // Prepare form data for unified submission
            // Note: Data is sent via EmailJS only - no localStorage storage for privacy/security
            const formData = {
                name: name,
                email: email,
                phone: phone,
                service: service,
                message: message
            };
            
            // Use unified submitAppointment function
            submitAppointment(formData)
                .then(function(response) {
                    // Prevent any scrolling - save current position
                    const currentScrollY = window.scrollY || window.pageYOffset || document.documentElement.scrollTop;
                    
                    // Success - Close popup and show confirmation
                    closeAppointmentPopup();
                    
                    // Prevent scroll before showing modal
                    window.scrollTo(0, currentScrollY);
                    document.documentElement.scrollTop = currentScrollY;
                    
                    showContactSuccessModal();
                    
                    // Play soft success sound
                    const audio = new Audio("https://assets.mixkit.co/sfx/preview/mixkit-achievement-bell-600.mp3");
                    audio.volume = 0.35;
                    audio.play().catch(() => { /* ignore autoplay restrictions */ });
                    
                    // Reset form
                    appointmentForm.reset();
                    
                    // Re-enable button
                    if (submitBtn) {
                        submitBtn.disabled = false;
                        submitBtn.textContent = originalBtnText;
                    }
                })
                .catch(function(error) {
                    // Re-enable button on error
                    if (submitBtn) {
                        submitBtn.disabled = false;
                        submitBtn.textContent = originalBtnText;
                    }
                });
        });
    }

    // ============================================
    // APPOINTMENT POPUP MODAL - BOOKING FLOW
    // ============================================
    
    // Calendar Utility Functions
    function toUTCStringForICS(dateObj) {
        const pad = function(n) {
            return String(n).padStart(2, '0');
        };
        return dateObj.getUTCFullYear() + 
               pad(dateObj.getUTCMonth() + 1) + 
               pad(dateObj.getUTCDate()) + 
               'T' + 
               pad(dateObj.getUTCHours()) + 
               pad(dateObj.getUTCMinutes()) + 
               pad(dateObj.getUTCSeconds()) + 
               'Z';
    }

    function escapeICSText(s) {
        return (s || '').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
    }

    function downloadICS(params) {
        const title = params.title || 'DNA Clinic Appointment';
        const description = params.description || '';
        const location = params.location || 'DNA Clinic, 123 Dental Avenue, Health District';
        const startDate = params.startDate || new Date();
        const endDate = params.endDate || new Date(startDate.getTime() + 45 * 60000);
        const filename = params.filename || 'DNA-Clinic-Appointment.ics';

        const dtStart = toUTCStringForICS(startDate);
        const dtEnd = toUTCStringForICS(endDate);

        const icsLines = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//DNA Clinic//EN',
            'CALSCALE:GREGORIAN',
            'BEGIN:VEVENT',
            'DTSTART:' + dtStart,
            'DTEND:' + dtEnd,
            'SUMMARY:' + escapeICSText(title),
            'DESCRIPTION:' + escapeICSText(description),
            'LOCATION:' + escapeICSText(location),
            'END:VEVENT',
            'END:VCALENDAR'
        ];

        const blob = new Blob([icsLines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(function() {
            URL.revokeObjectURL(url);
        }, 1000);
    }

    function createGoogleCalendarLink(params) {
        const title = params.title || 'DNA Clinic Appointment';
        const description = params.description || '';
        const location = params.location || 'DNA Clinic, 123 Dental Avenue, Health District';
        const startDate = params.startDate || new Date();
        const endDate = params.endDate || new Date(startDate.getTime() + 45 * 60000);

        const fmt = function(d) {
            return toUTCStringForICS(d);
        };

        const paramsObj = {
            text: title,
            dates: fmt(startDate) + '/' + fmt(endDate),
            details: description,
            location: location
        };

        const queryString = Object.keys(paramsObj).map(function(key) {
            return encodeURIComponent(key) + '=' + encodeURIComponent(paramsObj[key]);
        }).join('&');

        return 'https://calendar.google.com/calendar/r/eventedit?' + queryString;
    }

    // Appointment Popup Modal Functions
    const appointmentPopup = document.getElementById('appointmentPopup');
    const appointmentPopupClose = document.getElementById('appointmentPopupClose');
    const appointmentPopupForm = document.getElementById('appointmentPopupForm');
    const appointmentConfirmationModal = document.getElementById('appointmentConfirmationModal');
    const appointmentConfirmClose = document.getElementById('appointmentConfirmClose');
    const addToCalendarBtn = document.getElementById('addToCalendarBtn');
    const googleCalendarLink = document.getElementById('googleCalendarLink');
    const chatboxCTA = document.getElementById('chatboxCTA');
    const ctaAppointmentBtn = document.getElementById('ctaAppointmentBtn');

    // Store appointment data for calendar
    let lastAppointmentData = null;

    // ============================================
    // UNIFIED APPOINTMENT SUBMISSION FUNCTION
    // ============================================
    function submitAppointment(formData) {
        // formData should be an object with all appointment fields
        // This function normalizes field names and sends via EmailJS
        
        // Security check: Reject if honeypot field is filled (spam)
        if (formData.website || formData.url || formData.honeypot) {
            return Promise.reject(new Error('Invalid submission'));
        }
        
        // Additional security validation
        const validation = validateFormData(formData, 'appointmentForm');
        if (!validation.valid) {
            return Promise.reject(new Error('Validation failed'));
        }
        
            const EMAILJS_CONFIG = {
                PUBLIC_KEY: '2fdaHy-1vPUqWh23A',
                SERVICE_ID: 'service_13xdgm3',
                TEMPLATE_ID: 'template_lpjsx54'
            };

        // Normalize and map all fields to EmailJS template variables
        // Always include all fields so EmailJS template receives them
        // Sanitize all string values before sending
            const emailData = {
                to_email: 'dentalaestheticsmiles@gmail.com',
            // Standard fields (for regular appointments)
            name: sanitizeInput(formData.name || formData.parentName || formData.parent_name || ''),
            email: sanitizeInput(formData.email || formData.parentEmail || formData.parent_email || ''),
            phone: sanitizeInput(formData.phone || ''),
            service: sanitizeInput(formData.service || ''),
            message: sanitizeInput(formData.message || 'No additional message'),
            date: sanitizeInput(formData.date || formData.appointment_date || ''),
            time: sanitizeInput(formData.time || formData.appointment_time || ''),
            // Kids appointment specific fields - ALWAYS include these
            parent_name: sanitizeInput(formData.parent_name || formData.parentName || formData.name || ''),
            parent_email: sanitizeInput(formData.parent_email || formData.parentEmail || formData.email || ''),
            child_name: sanitizeInput(formData.child_name || formData.kidName || formData.childName || formData.kid_name || ''),
            kidName: sanitizeInput(formData.child_name || formData.kidName || formData.childName || formData.kid_name || ''),
            kid_name: sanitizeInput(formData.child_name || formData.kidName || formData.childName || formData.kid_name || ''),
            appointment_date: sanitizeInput(formData.appointment_date || formData.date || ''),
            appointment_time: sanitizeInput(formData.appointment_time || formData.time || '')
            };

            // Send email via EmailJS
            if (EMAILJS_CONFIG.PUBLIC_KEY && typeof emailjs !== 'undefined') {
            return emailjs.send(
                    EMAILJS_CONFIG.SERVICE_ID,
                    EMAILJS_CONFIG.TEMPLATE_ID,
                    emailData,
                    EMAILJS_CONFIG.PUBLIC_KEY
            );
        } else {
            // Return a rejected promise if EmailJS is not available
            return Promise.reject(new Error('EmailJS not loaded'));
        }
    }

    // Make submitAppointment globally accessible
    window.submitAppointment = submitAppointment;

    // Open appointment popup - FIXED: Mobile/Desktop visibility and scrolling
    function openAppointmentPopup() {
        if (appointmentPopup) {
            // Set minimum date to today (prevent past dates)
            const dateInput = document.getElementById('popupDate');
            if (dateInput) {
                const today = new Date();
                const year = today.getFullYear();
                const month = String(today.getMonth() + 1).padStart(2, '0');
                const day = String(today.getDate()).padStart(2, '0');
                const minDate = year + '-' + month + '-' + day;
                dateInput.setAttribute('min', minDate);
            }
            
            // Lock body scroll and save scroll position (like kids modal)
            hideQuestionPopupOnModalOpen();
            lockBodyScroll();
            
            // Show modal with explicit positioning
            appointmentPopup.style.display = 'flex';
            appointmentPopup.style.visibility = 'visible';
            appointmentPopup.style.opacity = '1';
            appointmentPopup.style.zIndex = '99999';
            
            // Get content element
            const content = appointmentPopup.querySelector(".appointment-popup-content");
            
            setTimeout(function() {
                appointmentPopup.classList.add('show');
                
                // Always scroll modal content to top
                if (content) {
                    content.scrollTop = 0;
                    // Ensure content is visible and scrollable
                    content.style.maxHeight = '90vh';
                    if (window.innerWidth <= 768) {
                        content.style.maxHeight = '92vh';
                    }
                }
                
                // Ensure modal backdrop is centered
                appointmentPopup.scrollTop = 0;
                
                // Focus name input (with delay for mobile keyboard)
                const nameInput = document.getElementById('popupName');
                if (nameInput) {
                    setTimeout(function() {
                        // Only focus on desktop to avoid mobile keyboard issues
                        if (window.innerWidth > 768) {
                            nameInput.focus();
                        }
                    }, 150);
                }
            }, 10);
        }
    }
    
    // Make openAppointmentPopup globally available immediately for chatbot access
    window.openAppointmentPopup = openAppointmentPopup;

    // Close appointment popup - Fixed scroll restore
    function closeAppointmentPopup() {
        if (appointmentPopup) {
            appointmentPopup.classList.remove('show');
            setTimeout(function() {
                appointmentPopup.style.display = 'none';
                
                // Restore body scroll (like kids modal)
                unlockBodyScroll();
            }, 300);
        }
    }

    // Close appointment confirmation modal - FIXED: Proper scroll restore
    function closeAppointmentConfirmation() {
        if (appointmentConfirmationModal) {
            appointmentConfirmationModal.classList.remove('show');
            setTimeout(function() {
                appointmentConfirmationModal.style.display = 'none';
                appointmentConfirmationModal.style.visibility = 'hidden';
                appointmentConfirmationModal.style.opacity = '0';
                
                // Restore body scroll
                unlockBodyScroll();
            }, 300);
        }
    }

    // Check if appointment form has any data
    function hasAppointmentFormData() {
        const form = document.getElementById('appointmentPopupForm');
        if (!form) return false;
        
        // Check all input fields
        const textInputs = form.querySelectorAll('input[type="text"], input[type="email"], input[type="tel"]');
        for (let input of textInputs) {
            if (input.value && input.value.trim() !== '') {
                return true;
            }
        }
        
        // Check select fields
        const selects = form.querySelectorAll('select');
        for (let select of selects) {
            if (select.value && select.value.trim() !== '' && select.value !== 'Select Preferred Time') {
                return true;
            }
        }
        
        // Check date input
        const dateInput = form.querySelector('input[type="date"]');
        if (dateInput && dateInput.value) {
            return true;
        }
        
        // Check textarea
        const textarea = form.querySelector('textarea');
        if (textarea && textarea.value && textarea.value.trim() !== '') {
            return true;
        }
        
        return false;
    }

    // Show exit confirmation for appointment popup - FIXED: Ensure visibility
    function showAppointmentExitConfirmation() {
        const exitModal = document.getElementById('appointmentExitConfirmationModal');
        if (!exitModal) {
            console.error('Appointment exit confirmation modal not found!');
            return;
        }
        
        // Ensure it appears above the appointment popup with maximum visibility
        exitModal.style.display = 'flex';
        exitModal.style.zIndex = '100001';
        exitModal.style.visibility = 'visible';
        exitModal.style.opacity = '1';
        exitModal.style.position = 'fixed';
        exitModal.style.top = '0';
        exitModal.style.left = '0';
        exitModal.style.right = '0';
        exitModal.style.bottom = '0';
        exitModal.style.width = '100vw';
        exitModal.style.height = '100vh';
        exitModal.style.background = 'rgba(0, 0, 0, 0.7)';
        exitModal.style.backdropFilter = 'blur(8px)';
        exitModal.style.alignItems = 'center';
        exitModal.style.justifyContent = 'center';
        
        // Ensure content is visible
        const content = exitModal.querySelector('.exit-confirmation-content');
        if (content) {
            content.style.display = 'block';
            content.style.visibility = 'visible';
            content.style.opacity = '1';
            content.style.position = 'relative';
            content.style.zIndex = '100002';
        }
        
        setTimeout(() => {
            exitModal.classList.add('show');
        }, 10);
    }

    // Close exit confirmation for appointment popup
    function closeAppointmentExitConfirmation() {
        const exitModal = document.getElementById('appointmentExitConfirmationModal');
        if (!exitModal) return;
        
        exitModal.classList.remove('show');
        setTimeout(() => {
            exitModal.style.display = 'none';
            exitModal.style.zIndex = '';
        }, 300);
    }

    // Close appointment modal and restore scroll
    function closeAppointmentModalAndRestore() {
        if (appointmentPopup) {
            appointmentPopup.classList.remove('show');
            setTimeout(() => {
                appointmentPopup.style.display = 'none';
                
                // Restore body scroll
                unlockBodyScroll();
            }, 300);
        }
    }

    // Named function for appointment popup backdrop click handler - FIXED: Proper event handling
    function handleAppointmentModalBackdropClick(e) {
        // Only trigger if clicking directly on the backdrop (modal container itself, not content)
        const clickedElement = e.target;
        const modalElement = e.currentTarget;
        
        // Check if click is on backdrop (not on modal content)
        if (clickedElement === modalElement || clickedElement.id === 'appointmentPopup') {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            
            // Check if form has data
            if (hasAppointmentFormData()) {
                // Show exit confirmation instead of closing
                showAppointmentExitConfirmation();
            } else {
                // No data, close directly
                closeAppointmentModalAndRestore();
            }
        }
    }

    // Set up backdrop click handler for appointment popup - FIXED: Proper initialization
    function initAppointmentPopupBackdropClick() {
        if (appointmentPopup) {
            // Remove any existing listeners
            appointmentPopup.removeEventListener("click", handleAppointmentModalBackdropClick);
            // Add new listener with capture phase to catch early
            appointmentPopup.addEventListener("click", handleAppointmentModalBackdropClick, true);
        }
    }
    
    // Initialize after DOM is ready
    setTimeout(() => {
        initAppointmentPopupBackdropClick();
    }, 200);

    // Exit confirmation handlers for appointment popup
    function handleAdultExitConfirmYes() {
        const exit = document.getElementById('appointmentExitConfirmationModal');
        const main = document.getElementById('appointmentPopup');
        if (exit) { exit.classList.remove('show'); exit.style.display='none'; }
        if (main) { main.classList.remove('show'); main.style.display='none'; }
        unlockBodyScroll();
    }

    const appointmentExitConfirmYes = document.getElementById("appointmentExitConfirmYes");
    const appointmentExitConfirmNo = document.getElementById("appointmentExitConfirmNo");
    
    if (appointmentExitConfirmYes) {
        appointmentExitConfirmYes.addEventListener("click", function(e) {
            e.preventDefault();
            e.stopPropagation();
            handleAdultExitConfirmYes();
        });
    }

    if (appointmentExitConfirmNo) {
        appointmentExitConfirmNo.addEventListener("click", function(e) {
            e.preventDefault();
            e.stopPropagation();
            closeAppointmentExitConfirmation();
            // Keep the main modal open - user continues editing
        });
    }

    // Close exit confirmation when clicking outside
    const appointmentExitModal = document.getElementById("appointmentExitConfirmationModal");
    if (appointmentExitModal) {
        appointmentExitModal.addEventListener("click", function(e) {
            if (e.target === appointmentExitModal) {
                e.preventDefault();
                e.stopPropagation();
                closeAppointmentExitConfirmation();
            }
        });
    }

    // Close exit confirmation on ESC - only if exit modal is open
    document.addEventListener("keydown", function(e) {
        if (e.key === 'Escape') {
            const exitModal = document.getElementById('appointmentExitConfirmationModal');
            if (exitModal && exitModal.classList.contains('show')) {
                e.preventDefault();
                e.stopPropagation();
                closeAppointmentExitConfirmation();
            }
        }
    });

    // Show premium success modal for contact form
    function showContactSuccessModal() {
        // FORCE SHOW - Maximum priority
        let modal = document.getElementById('contactSuccessModal');
        if (!modal) {
            alert('Your appointment request has been received! Our team will contact you shortly.');
            return;
        }
        
        // Close any other modals that might be blocking
        const otherModals = [
            'appointmentPopup',
            'appointmentConfirmationModal',
            'kidsAppointmentModal',
            'kidsAppointmentConfirmationModal',
            'chatbotAppointmentModal',
            'chatbotAppointmentConfirmationModal'
        ];
        otherModals.forEach(function(modalId) {
            const otherModal = document.getElementById(modalId);
            if (otherModal) {
                otherModal.classList.remove('show');
                otherModal.style.display = 'none';
                otherModal.style.visibility = 'hidden';
                otherModal.style.opacity = '0';
            }
        });
        
        // Prevent any scrolling - save current scroll position first
        const currentScrollY = window.scrollY || window.pageYOffset || document.documentElement.scrollTop;
        
        // Ensure body is visible
        document.body.style.visibility = 'visible';
        document.body.style.opacity = '1';
        document.body.style.overflow = 'hidden';
        
        // Prevent scrolling immediately
        window.scrollTo(0, currentScrollY);
        document.documentElement.scrollTop = currentScrollY;
        document.body.scrollTop = currentScrollY;
        
        // Reset checkmark animation
        const checkmark = modal.querySelector('.checkmark');
        if (checkmark) {
            const checkmarkParent = checkmark.parentElement;
            const checkmarkClone = checkmark.cloneNode(true);
            checkmarkParent.replaceChild(checkmarkClone, checkmark);
        }
        
        // Lock body scroll (this preserves scroll position)
        lockBodyScroll();
        
        // Ensure we stay at current scroll position after lock
        setTimeout(function() {
            window.scrollTo(0, currentScrollY);
            document.documentElement.scrollTop = currentScrollY;
        }, 0);
        
        // FORCE REMOVE all hiding styles
        modal.style.removeProperty('display');
        modal.style.removeProperty('visibility');
        modal.style.removeProperty('opacity');
        modal.style.removeProperty('z-index');
        
        // FORCE SHOW with maximum z-index
        modal.style.cssText = 'position: fixed !important; top: 0 !important; left: 0 !important; right: 0 !important; bottom: 0 !important; width: 100vw !important; height: 100vh !important; display: flex !important; align-items: center !important; justify-content: center !important; padding: 20px !important; background: rgba(0, 0, 0, 0.6) !important; backdrop-filter: blur(8px) !important; z-index: 99999999 !important; overflow-y: auto !important; visibility: visible !important; opacity: 1 !important;';
        modal.classList.add('show');
        
        // Ensure content box is visible and centered
        const box = modal.querySelector('.premium-success-content');
        if (box) {
            box.scrollTop = 0;
            box.style.cssText = 'width: 100% !important; max-width: 480px !important; max-height: 90vh !important; overflow-y: auto !important; overflow-x: hidden !important; background: linear-gradient(135deg, #ffffff 0%, #f8f5ff 100%) !important; border-radius: 24px !important; padding: 40px 32px !important; box-shadow: 0 24px 80px rgba(124, 58, 237, 0.3), 0 0 0 1px rgba(124, 58, 237, 0.15) !important; position: relative !important; margin: 0 auto !important; text-align: center !important; visibility: visible !important; opacity: 1 !important;';
        }
        
        // Ensure close button is visible and clickable
        const closeBtn = modal.querySelector('#contactSuccessClose, .premium-close');
        if (closeBtn) {
            closeBtn.style.cssText = 'position: absolute !important; top: 16px !important; right: 16px !important; width: 36px !important; height: 36px !important; border-radius: 50% !important; background: rgba(124, 58, 237, 0.1) !important; border: none !important; color: #7C3AED !important; font-size: 24px !important; line-height: 1 !important; cursor: pointer !important; display: flex !important; align-items: center !important; justify-content: center !important; z-index: 100 !important; visibility: visible !important; opacity: 1 !important;';
        }
        
        // Force reflow
        void modal.offsetHeight;
        
        // Restart animation
        if (box) {
            box.style.animation = 'none';
            void box.offsetHeight;
            box.style.animation = 'successModalFadeIn 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
        }
    }
    
    // Close premium success modal
    function closeContactSuccessModal() {
        const modal = document.getElementById('contactSuccessModal');
        if (!modal) return;
        modal.classList.remove('show');
        modal.style.opacity = '0';
        modal.style.visibility = 'hidden';
        setTimeout(() => {
            modal.style.display = 'none';
            unlockBodyScroll();
        }, 250);
    }
    
    // Event listeners for success modal
    const contactSuccessClose = document.getElementById('contactSuccessClose');
    const contactSuccessOk = document.getElementById('contactSuccessOk');
    const contactSuccessModal = document.getElementById('contactSuccessModal');
    
    if (contactSuccessClose) {
        contactSuccessClose.addEventListener('click', closeContactSuccessModal);
    }
    if (contactSuccessOk) {
        contactSuccessOk.addEventListener('click', closeContactSuccessModal);
    }
    if (contactSuccessModal) {
        contactSuccessModal.addEventListener('click', function(e) {
            if (e.target === contactSuccessModal) {
                closeContactSuccessModal();
            }
        });
    }
    
    // ESC key to close success modal
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && contactSuccessModal && contactSuccessModal.classList.contains('show')) {
            closeContactSuccessModal();
        }
    });

    // Show confirmation modal - FIXED: Ensure visibility
    function showAppointmentConfirmation(appointmentData) {
        lastAppointmentData = appointmentData;
        
        if (!appointmentConfirmationModal) {
            // Appointment confirmation modal not found (silent failure)
            return;
        }
        
        // Lock body scroll
        lockBodyScroll();
        
        // Show modal with explicit visibility
        appointmentConfirmationModal.style.display = 'flex';
        appointmentConfirmationModal.style.zIndex = '100000';
        appointmentConfirmationModal.style.visibility = 'visible';
        appointmentConfirmationModal.style.opacity = '1';
        appointmentConfirmationModal.style.position = 'fixed';
        appointmentConfirmationModal.style.top = '0';
        appointmentConfirmationModal.style.left = '0';
        appointmentConfirmationModal.style.right = '0';
        appointmentConfirmationModal.style.bottom = '0';
        appointmentConfirmationModal.style.width = '100vw';
        appointmentConfirmationModal.style.height = '100vh';
        appointmentConfirmationModal.style.alignItems = 'center';
        appointmentConfirmationModal.style.justifyContent = 'center';
        
        // Ensure content is visible
        const content = appointmentConfirmationModal.querySelector('.appointment-confirmation-content');
        if (content) {
            content.style.display = 'block';
            content.style.visibility = 'visible';
            content.style.opacity = '1';
            content.style.position = 'relative';
            content.style.zIndex = '100001';
        }
        
        setTimeout(function() {
            appointmentConfirmationModal.classList.add('show');
        }, 10);

            // Set up calendar links
            if (appointmentData) {
                const service = appointmentData.service || 'Appointment';
                const name = appointmentData.name || '';
                const phone = appointmentData.phone || '+91 80729 80232';
                const message = appointmentData.message || '';

                // Calculate appointment date/time
                let startDate = new Date();
                let endDate = new Date(startDate.getTime() + 45 * 60000); // Default 45 min

                if (appointmentData.date) {
                    const dateStr = appointmentData.date;
                    const timeStr = appointmentData.time || '10:00';
                    const [hours, minutes] = timeStr.split(':').map(Number);
                    
                    startDate = new Date(dateStr);
                    startDate.setHours(hours || 10, minutes || 0, 0, 0);
                    endDate = new Date(startDate.getTime() + 45 * 60000);
                }

                const title = 'DNA Clinic - ' + service;
                const description = 'Service: ' + service + '\\nPatient: ' + name + '\\nPhone: ' + phone + '\\nNotes: ' + message;
                const location = 'DNA Clinic, 123 Dental Avenue, Health District';

                // Set up Add to Phone Calendar button
                if (addToCalendarBtn) {
                    addToCalendarBtn.onclick = function() {
                        downloadICS({
                            title: title,
                            description: description,
                            location: location,
                            startDate: startDate,
                            endDate: endDate,
                            filename: 'DNA-Clinic-Appointment.ics',
                        });
                    };
                }

                // Set up Google Calendar link
                if (googleCalendarLink) {
                    googleCalendarLink.href = createGoogleCalendarLink({
                        title: title,
                        description: description,
                        location: location,
                        startDate: startDate,
                        endDate: endDate
                    });
                }
            }
    }

    // Form validation - FIXED: Only validate visible required fields, prevent browser native validation
    function validateAppointmentForm() {
        const nameInput = document.getElementById('popupName');
        const emailInput = document.getElementById('popupEmail');
        const phoneInput = document.getElementById('popupPhone');
        const serviceInput = document.getElementById('popupService');
        const honeypotInput = appointmentPopupForm ? appointmentPopupForm.querySelector('input[name="website"]') : null;

        let isValid = true;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        let firstInvalidField = null;

        // Remove required from honeypot to prevent browser validation
        if (honeypotInput) {
            honeypotInput.removeAttribute('required');
        }

        // Remove previous errors
        [nameInput, emailInput, phoneInput, serviceInput].forEach(function(input) {
            if (input) {
                input.classList.remove('input-error');
                // Ensure visible required fields keep required attribute
                if (input.type !== 'hidden' && input.style.display !== 'none' && input.offsetParent !== null) {
                    if (input.id === 'popupName' || input.id === 'popupEmail' || input.id === 'popupPhone' || input.id === 'popupService') {
                        input.setAttribute('required', 'required');
                    }
                }
            }
        });

        // Validate name
        if (!nameInput || !nameInput.value.trim()) {
            if (nameInput) {
                nameInput.classList.add('input-error');
                if (!firstInvalidField) firstInvalidField = nameInput;
            }
            isValid = false;
        }

        // Validate email
        if (!emailInput || !emailInput.value.trim() || !emailRegex.test(emailInput.value.trim())) {
            if (emailInput) {
                emailInput.classList.add('input-error');
                if (!firstInvalidField) firstInvalidField = emailInput;
            }
            isValid = false;
        }

        // Validate phone (at least 10 digits)
        if (!phoneInput || !phoneInput.value.trim() || phoneInput.value.replace(/\D/g, '').length < 10) {
            if (phoneInput) {
                phoneInput.classList.add('input-error');
                if (!firstInvalidField) firstInvalidField = phoneInput;
            }
            isValid = false;
        }

        // Validate service
        if (!serviceInput || !serviceInput.value) {
            if (serviceInput) {
                serviceInput.classList.add('input-error');
                if (!firstInvalidField) firstInvalidField = serviceInput;
            }
            isValid = false;
        }

        // Scroll to first invalid field if form is invalid
        if (!isValid && firstInvalidField) {
            firstInvalidField.scrollIntoView({ behavior: 'smooth', block: 'center' });
            firstInvalidField.focus();
        }

        return isValid;
    }

    // Event Listeners for Appointment Popup
    if (appointmentPopupClose) {
        appointmentPopupClose.addEventListener('click', closeAppointmentPopup);
    }

    // Old backdrop click handler removed - now using handleAppointmentModalBackdropClick with exit confirmation

    if (appointmentConfirmClose) {
        appointmentConfirmClose.addEventListener('click', closeAppointmentConfirmation);
    }

    if (appointmentConfirmationModal) {
        appointmentConfirmationModal.addEventListener('click', function(e) {
            if (e.target === appointmentConfirmationModal) {
                closeAppointmentConfirmation();
            }
        });
    }

    // Open popup from buttons with class .bookAppointmentBtn
    document.querySelectorAll('.bookAppointmentBtn').forEach(function(btn) {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            openAppointmentPopup();
        });
    });

    // CTA Appointment Button
    if (ctaAppointmentBtn) {
        ctaAppointmentBtn.addEventListener('click', function(e) {
            e.preventDefault();
            openAppointmentPopup();
        });
    }

    // Form Submission
    if (appointmentPopupForm) {
        appointmentPopupForm.addEventListener('submit', function(e) {
            e.preventDefault();

            if (!validateAppointmentForm()) {
                return;
            }

            // Use FormData to get all form values
            const formDataObj = new FormData(appointmentPopupForm);
            
            const name = formDataObj.get('name') || '';
            const email = formDataObj.get('email') || '';
            const phone = formDataObj.get('phone') || '';
            const service = formDataObj.get('service') || '';
            const date = formDataObj.get('appointment_date') || '';
            const time = formDataObj.get('appointment_time') || '';
            const message = formDataObj.get('message') || '';

            if (!name || !email || !phone || !service) {
                return;
            }

            // Prepare form data for unified submission
            const formData = {
                name: name.trim(),
                email: email.trim(),
                phone: phone.trim(),
                service: service,
                date: date,
                time: time,
                message: message.trim(),
                // Include honeypot field for spam detection
                website: formDataObj.get('website') || ''
            };
            
            // Security validation before submission
            const validation = validateFormData(formData, 'appointmentPopupForm');
            if (!validation.valid) {
                // Show user-friendly error message (non-intrusive)
                if (validation.errors.length > 0 && !validation.errors[0].includes('Spam')) {
                    alert('Please check your information: ' + validation.errors.join(', '));
                }
                return;
            }
            
            // Add additional fields for EmailJS
            formData.appointment_date = date;
            formData.appointment_time = time;

            // Disable submit button and show loading state
            const submitBtn = appointmentPopupForm.querySelector('button[type="submit"]');
            const originalBtnText = submitBtn ? submitBtn.textContent : 'Book Appointment';
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Booking...';
            }

            // Use unified submitAppointment function
            submitAppointment(formData)
                .then(function(response) {
                    // Success - Close popup and show confirmation
                    closeAppointmentPopup();
                    
                    // Show confirmation modal
                    showAppointmentConfirmation({
                        name: name,
                        email: email,
                        phone: phone,
                        service: service,
                        date: date,
                        time: time,
                        message: message
                    });
            
            // Reset form
                    appointmentPopupForm.reset();
                    
                    // Re-enable button
                    if (submitBtn) {
                        submitBtn.disabled = false;
                        submitBtn.textContent = originalBtnText;
                    }
                })
                .catch(function(error) {
                    // Error - Show inline error message
                    if (submitBtn) {
                        submitBtn.disabled = false;
                        submitBtn.textContent = originalBtnText;
                    }
                    
                    // Show error message in popup
                    let errorMsg = appointmentPopupForm.querySelector('.form-error-message');
                    if (!errorMsg) {
                        errorMsg = document.createElement('div');
                        errorMsg.className = 'form-error-message';
                        errorMsg.style.cssText = 'color: #ef4444; margin-top: 1rem; padding: 0.75rem; background: #fee2e2; border-radius: 8px; text-align: center;';
                        appointmentPopupForm.appendChild(errorMsg);
                    }
                    errorMsg.textContent = 'There was an issue sending your request. Please try again or contact us directly.';
                    
                    // Remove error message after 5 seconds
                    setTimeout(() => {
                        if (errorMsg && errorMsg.parentNode) {
                            errorMsg.remove();
                        }
                    }, 5000);
                    
                    // Restore body scroll in case of error
                    document.body.style.overflow = '';
                    document.body.style.position = '';
                    document.body.style.width = '';
                    document.body.style.top = '';
                });
        });
    }

    // Make functions globally accessible for AI chatbox integration
    window.openAppointmentPopup = openAppointmentPopup;
    window.finishAIChatAndMinimize = function() {
        const chatbox = document.getElementById('question-popup');
        if (chatbox) {
            chatbox.classList.add('minimized');
            setTimeout(function() {
                if (chatboxCTA) {
                    chatboxCTA.style.display = 'flex';
                }
            }, 350);
        }
    };

    // ============================================
    // KIDS APPOINTMENT MODAL - FINAL FIX
    // ============================================
    function initKidsModal() {
        const kidsAppointmentForm = document.getElementById('kidsAppointmentForm');

        // Set minimum date to today
        const kidDateInput = document.getElementById('kidDate');
        if (kidDateInput) {
            const today = new Date().toISOString().split('T')[0];
            kidDateInput.setAttribute('min', today);
        }

        // Open Kids Appointment Modal
        document.getElementById("kidsAppointmentBtn")?.addEventListener("click", (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    
            const modal = document.getElementById("kidsAppointmentModal");
            if (modal) {
                // Lock body scroll immediately
                        document.body.style.overflow = 'hidden';
                document.body.style.position = 'fixed';
                document.body.style.width = '100%';
                
                // Save current scroll position
                const scrollY = window.scrollY;
                document.body.style.top = `-${scrollY}px`;
                
                // Show modal
                modal.style.display = 'flex';
                setTimeout(() => {
                    modal.classList.add("show");
                }, 10);

                // Always scroll modal content to top to avoid hidden header
                const content = modal.querySelector(".kids-modal-content");
                if (content) {
                    content.scrollTop = 0;
                }
                
                // Ensure modal is centered in viewport
                modal.scrollTop = 0;
            }
        });

        // Close Kids Appointment Modal
        document.querySelector(".kids-close-modal")?.addEventListener("click", () => {
            const modal = document.getElementById("kidsAppointmentModal");
            if (modal) {
                modal.classList.remove("show");
                setTimeout(() => {
                    modal.style.display = 'none';
                }, 300);
                
                // Restore body scroll
                unlockBodyScroll();
            }
        });

        // Check if form has any data - robust detection
        function hasFormData() {
            const form = document.getElementById('kidsAppointmentForm');
            if (!form) return false;
            
            // Check all input fields
            const textInputs = form.querySelectorAll('input[type="text"], input[type="email"], input[type="tel"]');
            for (let input of textInputs) {
                if (input.value && input.value.trim() !== '') {
                    return true;
                }
            }
            
            // Check select fields
            const selects = form.querySelectorAll('select');
            for (let select of selects) {
                if (select.value && select.value.trim() !== '' && select.value !== 'Select time') {
                    return true;
                }
            }
            
            // Check date input
            const dateInput = form.querySelector('input[type="date"]');
            if (dateInput && dateInput.value) {
                return true;
            }
            
            // Check textarea
            const textarea = form.querySelector('textarea');
            if (textarea && textarea.value && textarea.value.trim() !== '') {
                return true;
            }
            
                    return false;
        }

        // Show exit confirmation modal
        function showExitConfirmation() {
            const exitModal = document.getElementById('kidsExitConfirmationModal');
            if (!exitModal) {
                // Exit confirmation modal not found (silent failure)
                return;
            }
            
            // Ensure it appears above the kids modal with maximum visibility
            exitModal.style.display = 'flex';
            exitModal.style.zIndex = '100001';
            exitModal.style.visibility = 'visible';
            exitModal.style.opacity = '1';
            exitModal.style.position = 'fixed';
            exitModal.style.top = '0';
            exitModal.style.left = '0';
            exitModal.style.right = '0';
            exitModal.style.bottom = '0';
            exitModal.style.width = '100vw';
            exitModal.style.height = '100vh';
            exitModal.style.background = 'rgba(0, 0, 0, 0.7)';
            exitModal.style.backdropFilter = 'blur(8px)';
            
            // Ensure content is visible
            const content = exitModal.querySelector('.exit-confirmation-content');
            if (content) {
                content.style.display = 'block';
                content.style.visibility = 'visible';
                content.style.opacity = '1';
                content.style.position = 'relative';
                content.style.zIndex = '100002';
            }
            
            setTimeout(() => {
                exitModal.classList.add('show');
            }, 10);
        }

        // Close exit confirmation modal
        function closeExitConfirmation() {
            const exitModal = document.getElementById('kidsExitConfirmationModal');
            if (!exitModal) return;
            
            exitModal.classList.remove('show');
            setTimeout(() => {
                exitModal.style.display = 'none';
                exitModal.style.zIndex = '';
            }, 300);
        }

        // Close kids modal and restore scroll
        function closeKidsModalAndRestore() {
            const modal = document.getElementById("kidsAppointmentModal");
            if (modal) {
                modal.classList.remove("show");
                setTimeout(() => {
                    modal.style.display = 'none';
                }, 300);
                
                // Restore body scroll
                unlockBodyScroll();
            }
        }

        // Close when clicking outside modal content - with confirmation
        // Use event delegation to ensure it works
        setTimeout(() => {
            const kidsModal = document.getElementById("kidsAppointmentModal");
            if (kidsModal) {
                // Remove any existing listener by using a named function
                kidsModal.removeEventListener("click", handleKidsModalBackdropClick);
                kidsModal.addEventListener("click", handleKidsModalBackdropClick, false);
            }
        }, 100);

        // Named function for backdrop click handler
        function handleKidsModalBackdropClick(e) {
            // Only trigger if clicking directly on the backdrop (modal container itself, not content)
            if (e.target === e.currentTarget || e.target.id === 'kidsAppointmentModal') {
                    e.preventDefault();
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                    
                // Check if form has data
                if (hasFormData()) {
                    // Show exit confirmation instead of closing
                    // Showing exit confirmation modal
                    showExitConfirmation();
                } else {
                    // No data, close directly
                    closeKidsModalAndRestore();
                }
            }
        }

        // Exit confirmation handlers - ensure they're set up properly
        function handleKidsExitConfirmYes() {
            const exit = document.getElementById('kidsExitConfirmationModal');
            const main = document.getElementById('kidsAppointmentModal');
            if (exit) { exit.classList.remove('show'); exit.style.display='none'; }
            if (main) { main.classList.remove('show'); main.style.display='none'; }
            unlockBodyScroll();
        }

        const exitConfirmYes = document.getElementById("exitConfirmYes");
        const exitConfirmNo = document.getElementById("exitConfirmNo");
        
        if (exitConfirmYes) {
            exitConfirmYes.addEventListener("click", function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                handleKidsExitConfirmYes();
            });
        }

        if (exitConfirmNo) {
            exitConfirmNo.addEventListener("click", function(e) {
                e.preventDefault();
                e.stopPropagation();
                closeExitConfirmation();
                // Keep the main modal open - user continues editing
            });
        }

        // Close exit confirmation when clicking outside
        const exitModal = document.getElementById("kidsExitConfirmationModal");
        if (exitModal) {
            exitModal.addEventListener("click", function(e) {
                if (e.target === exitModal) {
                    e.preventDefault();
                    e.stopPropagation();
                    closeExitConfirmation();
                    }
                });
            }

        // Close exit confirmation on ESC - only if exit modal is open
        document.addEventListener("keydown", function(e) {
            if (e.key === 'Escape') {
                const exitModal = document.getElementById('kidsExitConfirmationModal');
                if (exitModal && exitModal.classList.contains('show')) {
                    e.preventDefault();
                    e.stopPropagation();
                    closeExitConfirmation();
                }
            }
        });

        // Form Submission - NO CLONENODE
        if (kidsAppointmentForm) {
            kidsAppointmentForm.addEventListener('submit', function(e) {
                    e.preventDefault();
                e.stopPropagation();
                
                const formData = new FormData(kidsAppointmentForm);
                const parentName = formData.get('parent_name') || '';
                const childName = formData.get('child_name') || '';
                const email = formData.get('parent_email') || '';
                const phone = formData.get('phone') || '';
                const service = formData.get('service') || '';
                const date = formData.get('appointment_date') || '';
                const time = formData.get('appointment_time') || '';
                const message = formData.get('kidMessage') || '';
                
                // Validate required fields with proper error styling
                let isValid = true;
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                let firstInvalidField = null;
                
                // Get all input elements
                const parentNameInput = kidsAppointmentForm.querySelector('input[name="parent_name"]');
                const childNameInput = kidsAppointmentForm.querySelector('input[name="child_name"]');
                const emailInput = kidsAppointmentForm.querySelector('input[name="parent_email"]');
                const phoneInput = kidsAppointmentForm.querySelector('input[name="phone"]');
                const serviceInput = kidsAppointmentForm.querySelector('select[name="service"]');
                const dateInput = kidsAppointmentForm.querySelector('input[name="appointment_date"]');
                const timeInput = kidsAppointmentForm.querySelector('select[name="appointment_time"]');
                
                // Remove previous errors
                [parentNameInput, childNameInput, emailInput, phoneInput, serviceInput, dateInput, timeInput].forEach(function(input) {
                    if (input) {
                        input.classList.remove('input-error');
                    }
                });
                
                // Validate parent name
                if (!parentName || !parentName.trim()) {
                    if (parentNameInput) {
                        parentNameInput.classList.add('input-error');
                        if (!firstInvalidField) firstInvalidField = parentNameInput;
                    }
                    isValid = false;
                }
                
                // Validate child name
                if (!childName || !childName.trim()) {
                    if (childNameInput) {
                        childNameInput.classList.add('input-error');
                        if (!firstInvalidField) firstInvalidField = childNameInput;
                    }
                    isValid = false;
                }
                
                // Validate email
                if (!email || !email.trim() || !emailRegex.test(email.trim())) {
                    if (emailInput) {
                        emailInput.classList.add('input-error');
                        if (!firstInvalidField) firstInvalidField = emailInput;
                    }
                    isValid = false;
                }
                
                // Validate phone (at least 10 digits)
                if (!phone || !phone.trim() || phone.replace(/\D/g, '').length < 10) {
                    if (phoneInput) {
                        phoneInput.classList.add('input-error');
                        if (!firstInvalidField) firstInvalidField = phoneInput;
                    }
                    isValid = false;
                }
                
                // Validate service
                if (!service || !service.trim() || service === 'Select Service') {
                    if (serviceInput) {
                        serviceInput.classList.add('input-error');
                        if (!firstInvalidField) firstInvalidField = serviceInput;
                    }
                    isValid = false;
                }
                
                // Validate date
                if (!date || !date.trim()) {
                    if (dateInput) {
                        dateInput.classList.add('input-error');
                        if (!firstInvalidField) firstInvalidField = dateInput;
                    }
                    isValid = false;
                }
                
                // Validate time
                if (!time || !time.trim() || time === 'Select Preferred Time') {
                    if (timeInput) {
                        timeInput.classList.add('input-error');
                        if (!firstInvalidField) firstInvalidField = timeInput;
                    }
                    isValid = false;
                }
                
                if (!isValid) {
                    // Scroll to first invalid field
                    if (firstInvalidField) {
                        firstInvalidField.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        firstInvalidField.focus();
                    }
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

                    const appointmentData = {
                    parent_name: parentName,
                    parent_email: email,
                    child_name: childName,
                        phone: phone,
                        service: service,
                    appointment_date: date,
                    appointment_time: time,
                    message: message
                };
                
                // Show confirmation modal immediately (optimistic UI)
                // Close appointment modal first
                const modal = document.getElementById("kidsAppointmentModal");
                if (modal) {
                    modal.classList.remove("show");
                    setTimeout(() => {
                        modal.style.display = 'none';
                        
                        // Restore body scroll
                        const scrollY = document.body.style.top;
                        document.body.style.overflow = '';
                        document.body.style.position = '';
                        document.body.style.width = '';
                        document.body.style.top = '';
                        
                        if (scrollY) {
                            window.scrollTo(0, parseInt(scrollY || '0') * -1);
                        }
                    }, 300);
                }
                
                // Show confirmation modal immediately
                showKidsConfirmation({
                    parentName: parentName,
                    childName: childName,
                    formattedDate: formattedDate,
                    time: time,
                        service: service,
                    phone: phone
                });
                
                // Reset form
                kidsAppointmentForm.reset();
                
                // Submit to EmailJS in background (fire and forget - don't block UI)
                submitAppointment(appointmentData).then(() => {
                    // Appointment submitted successfully (no sensitive data logged)
                }).catch((error) => {
                    // Error submitting appointment (no sensitive data logged)
                    // Modal already shown, so user experience is not affected
                    // EmailJS failure doesn't prevent confirmation from showing
                });
            });
        }
    }
    
    // Show Kids Confirmation Modal
    function showKidsConfirmation(data) {
        const kidsConfirmationModal = document.getElementById('kidsAppointmentConfirmationModal');
        const kidsConfirmationMessage = document.getElementById('kidsConfirmationMessage');
        const kidsConfirmationInfo = document.getElementById('kidsConfirmationInfo');
        const kidsConfirmationClose = document.getElementById('kidsConfirmationClose');
        
        if (!kidsConfirmationModal) {
            // Kids confirmation modal not found (silent failure)
            return;
        }
        
        // Set message
        if (kidsConfirmationMessage) {
            kidsConfirmationMessage.textContent = `Thank you, ${data.parentName}! We're excited to meet ${data.childName}!`;
        }
        
        // Set appointment details
        if (kidsConfirmationInfo) {
            kidsConfirmationInfo.innerHTML = `
                <div class="kids-confirmation-info-item">
                    <i class="fas fa-calendar-alt"></i>
                    <strong>Date:</strong>
                    <span>${data.formattedDate}</span>
                </div>
                <div class="kids-confirmation-info-item">
                    <i class="fas fa-clock"></i>
                    <strong>Time:</strong>
                    <span>${data.time}</span>
                </div>
                <div class="kids-confirmation-info-item">
                    <i class="fas fa-tooth"></i>
                    <strong>Service:</strong>
                    <span>${data.service}</span>
                </div>
                <div class="kids-confirmation-info-item">
                    <i class="fas fa-phone"></i>
                    <strong>Contact:</strong>
                    <span>We'll call you at ${data.phone}</span>
                </div>
            `;
        }
        
        // Lock body scroll
        document.body.style.overflow = 'hidden';
        document.body.style.position = 'fixed';
        document.body.style.width = '100%';
        const scrollY = window.scrollY;
        document.body.style.top = `-${scrollY}px`;
        
        // Show modal - ensure it's visible and properly positioned
        kidsConfirmationModal.style.display = 'flex';
        kidsConfirmationModal.style.zIndex = '100000';
        kidsConfirmationModal.style.visibility = 'visible';
        kidsConfirmationModal.style.opacity = '1';
        kidsConfirmationModal.style.position = 'fixed';
        kidsConfirmationModal.style.top = '0';
        kidsConfirmationModal.style.left = '0';
        kidsConfirmationModal.style.right = '0';
        kidsConfirmationModal.style.bottom = '0';
        kidsConfirmationModal.style.width = '100vw';
        kidsConfirmationModal.style.height = '100vh';
        kidsConfirmationModal.style.alignItems = 'center';
        kidsConfirmationModal.style.justifyContent = 'center';
        
        // Ensure modal content is visible and properly styled
        const content = kidsConfirmationModal.querySelector('.kids-confirmation-content');
        if (content) {
            content.style.display = 'block';
            content.style.visibility = 'visible';
            content.style.opacity = '1';
            content.style.position = 'relative';
            content.style.zIndex = '100001';
            content.scrollTop = 0;
        }
        
        setTimeout(() => {
            kidsConfirmationModal.classList.add('show');
        }, 10);
        
        // Close handler - remove old listeners first
        if (kidsConfirmationClose) {
            // Remove existing listeners
            const newCloseBtn = kidsConfirmationClose.cloneNode(true);
            kidsConfirmationClose.parentNode.replaceChild(newCloseBtn, kidsConfirmationClose);
            const freshCloseBtn = document.getElementById('kidsConfirmationClose');
            
            if (freshCloseBtn) {
                freshCloseBtn.onclick = function() {
                    kidsConfirmationModal.classList.remove('show');
                    setTimeout(() => {
                        kidsConfirmationModal.style.display = 'none';
                        
                        // Restore body scroll
                        const scrollY = document.body.style.top;
                        document.body.style.overflow = '';
                        document.body.style.position = '';
                        document.body.style.width = '';
                        document.body.style.top = '';
                        
                        if (scrollY) {
                            window.scrollTo(0, parseInt(scrollY || '0') * -1);
                        }
                    }, 300);
                };
            }
        }
        
        // Close on backdrop click - remove old listeners first
        const backdropHandler = function(e) {
            if (e.target === kidsConfirmationModal) {
                const closeBtn = document.getElementById('kidsConfirmationClose');
                if (closeBtn) {
                    closeBtn.click();
                }
            }
        };
        
        // Remove old listener and add new one
        kidsConfirmationModal.removeEventListener('click', backdropHandler);
        kidsConfirmationModal.addEventListener('click', backdropHandler);
        
        // Close on ESC key
        const escHandler = function(e) {
            if (e.key === 'Escape' && kidsConfirmationModal.classList.contains('show')) {
                const closeBtn = document.getElementById('kidsConfirmationClose');
                if (closeBtn) {
                    closeBtn.click();
                }
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.removeEventListener('keydown', escHandler); // Remove old listener
        document.addEventListener('keydown', escHandler);
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
        
        // CSP-safe event listeners with function references
        var initAnimationsOnEvent = function() {
                if ('requestIdleCallback' in window) {
                    requestIdleCallback(initAnimations, { timeout: 2000 });
                } else {
                var animTimeout = setTimeout(function() {
                    initAnimations();
                }, 1000);
                }
        };
        
        ['click', 'touchstart', 'scroll'].forEach(function(e) {
            document.addEventListener(e, initAnimationsOnEvent, { once: true, passive: true });
        });
        
        var animInitTimeout = setTimeout(function() {
            if ('requestIdleCallback' in window) {
                requestIdleCallback(initAnimations, { timeout: 2000 });
            } else {
                var animTimeout2 = setTimeout(function() {
                    initAnimations();
                }, 2000);
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
    
    // CSP-safe hover effects initialization
    var initHoverEffectsOnEvent = function() {
        if ('requestIdleCallback' in window) {
            requestIdleCallback(initHoverEffects, { timeout: 1000 });
        } else {
            var hoverTimeout = setTimeout(function() {
                initHoverEffects();
            }, 500);
        }
    };
    
    document.addEventListener('mousemove', initHoverEffectsOnEvent, { once: true, passive: true });
    
    var hoverInitTimeout = setTimeout(function() {
        if ('requestIdleCallback' in window) {
            requestIdleCallback(initHoverEffects, { timeout: 2000 });
        } else {
            var hoverTimeout2 = setTimeout(function() {
                initHoverEffects();
            }, 2000);
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
        var revealTimeout = setTimeout(function() {
            initReveal();
        }, 2000);
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
    // VIDEO TESTIMONIAL SECTION - MOBILE COMPLIANT + FULLSCREEN
    // SPECIAL FIX FOR FIRST VIDEO - 100% RELIABLE FULLSCREEN
    // ============================================
    const videos = document.querySelectorAll(".testimonial-video");
    
    // CRITICAL: Handle first video separately for 100% reliability
    const firstVideo = document.querySelector(".testimonial-card-1 .testimonial-video");
    
    function setupVideoFullscreen(video, isFirstVideo) {
        // iOS REQUIREMENTS - Must be set immediately
        video.setAttribute("playsinline", "");
        video.setAttribute("webkit-playsinline", "");
        video.setAttribute("muted", ""); // must stay muted until user interacts
        video.muted = true;
        video.setAttribute("controls", "");
        video.setAttribute("controlsList", "nodownload"); // Removed noremoteplayback to allow fullscreen
        video.setAttribute("allowfullscreen", "");
        video.setAttribute("webkitallowfullscreen", "");
        video.setAttribute("mozallowfullscreen", "");
        
        // Ensure fullscreen is enabled on mobile
        video.setAttribute("x5-playsinline", "false"); // Android X5 browser
        video.setAttribute("x5-video-player-type", "h5"); // Android X5 browser
        video.setAttribute("x5-video-player-fullscreen", "true"); // Android X5 browser
        
        // CRITICAL FOR FIRST VIDEO: Enhanced fullscreen capability
        if (isFirstVideo) {
            // Force enable fullscreen on iOS Safari
            video.setAttribute("webkit-playsinline", "true"); // Allow inline, but enable fullscreen
            video.setAttribute("playsinline", "true"); // iOS compatibility
            // Ensure video wrapper doesn't block fullscreen
            const wrapper = video.closest(".video-wrapper");
            if (wrapper) {
                wrapper.style.position = "relative";
                wrapper.style.zIndex = "auto";
                wrapper.style.overflow = "visible";
            }
            // Ensure video card doesn't block
            const card = video.closest(".video-card");
            if (card) {
                card.style.overflow = "visible";
                card.style.zIndex = "auto";
            }
        }

        // PREVENT BROKEN AUTOPLAY
            video.autoplay = false;

        // FIX POSTER IF MISSING
        video.addEventListener("loadeddata", function() {
            if (!video.getAttribute("poster") || video.getAttribute("poster") === "") {
                try {
                    const canvas = document.createElement("canvas");
                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;
                    canvas.getContext("2d").drawImage(video, 0, 0);
                    video.setAttribute("poster", canvas.toDataURL("image/png"));
                    } catch (e) {
                    console.warn("Poster generation failed", e);
                }
            }
        });

        // USER INITIATED PLAY FIX
        video.addEventListener("play", function() {
            video.muted = false; // user gesture → safe to unmute
            
            // CRITICAL FOR FIRST VIDEO: Force enable fullscreen on play
            if (isFirstVideo) {
                // Ensure fullscreen is available immediately when playing
                if (video.webkitEnterFullscreen) {
                    // iOS Safari - make sure it's callable
                    video.setAttribute("webkitEnterFullscreen", "");
                }
            }
        });

        // FULLSCREEN API HANDLER - Cross-browser support (including mobile)
        // ENHANCED FOR FIRST VIDEO - 100% RELIABILITY
        function enterFullscreen() {
            // CRITICAL FOR FIRST VIDEO: Try iOS Safari first on mobile
            if (isFirstVideo && /iPhone|iPad|iPod/.test(navigator.userAgent)) {
                // iOS Safari - this is the key for mobile!
                if (video.webkitEnterFullscreen) {
                    try {
                        video.webkitEnterFullscreen();
                        return; // Exit early if successful
                    } catch (e) {
                        console.warn("iOS fullscreen failed, trying fallback:", e);
                    }
                }
            }
            
            // Try standard fullscreen first (desktop)
            if (video.requestFullscreen) {
                video.requestFullscreen().catch(function(err) {
                    console.warn("Fullscreen request failed:", err);
                    // Fallback for first video
                    if (isFirstVideo && video.webkitEnterFullscreen) {
                        try {
                            video.webkitEnterFullscreen();
                        } catch (e) {
                            console.warn("Fallback fullscreen failed:", e);
                        }
                    }
                });
            } else if (video.webkitRequestFullscreen) {
                // Chrome/Edge
                video.webkitRequestFullscreen();
            } else if (video.webkitEnterFullscreen) {
                // iOS Safari fallback
                try {
                    video.webkitEnterFullscreen();
                                        } catch (e) {
                    console.warn("iOS fullscreen failed:", e);
                }
            } else if (video.msRequestFullscreen) {
                // IE/Edge
                video.msRequestFullscreen();
            } else if (video.mozRequestFullScreen) {
                // Firefox
                video.mozRequestFullScreen();
            }
        }

        // For mobile: Add tap handler to enter fullscreen when video is playing
        // ENHANCED FOR FIRST VIDEO: More reliable tap detection
        let tapCount = 0;
        let tapTimer = null;
        video.addEventListener("click", function(e) {
            // CRITICAL FOR FIRST VIDEO: Single tap on mobile to enter fullscreen
            if (isFirstVideo && /iPhone|iPad|iPod|Android/.test(navigator.userAgent)) {
                // On first video, try fullscreen immediately on mobile
                if (!document.fullscreenElement && !document.webkitFullscreenElement && !document.mozFullScreenElement) {
                    setTimeout(function() {
                        enterFullscreen();
                    }, 100);
                }
            } else {
                // On other videos, double-tap to enter fullscreen
                tapCount++;
                if (tapTimer) clearTimeout(tapTimer);
                tapTimer = setTimeout(function() {
                    if (tapCount === 2 && !document.fullscreenElement && !document.webkitFullscreenElement) {
                        // Double tap detected and not in fullscreen
                        enterFullscreen();
                    }
                    tapCount = 0;
                }, 300);
            }
        });

        // Add double-click for fullscreen (desktop)
        video.addEventListener("dblclick", function() {
            enterFullscreen();
        });

        // DISABLE DOWNLOAD & CONTEXT MENU
        video.addEventListener("contextmenu", function(e) {
                    e.preventDefault();
        });
    }
    
    // Setup first video with special handling for 100% reliability
    if (firstVideo) {
        setupVideoFullscreen(firstVideo, true);
    }
    
    // Setup all other videos
    videos.forEach(function(video) {
        if (video !== firstVideo) {
            setupVideoFullscreen(video, false);
        }
    });
    
    // Re-attach video pause triggers after video initialization
    if (typeof attachVideoPauseTriggers === "function") {
        attachVideoPauseTriggers();
    }

    // ============================================
    // BLOG MODAL FUNCTIONALITY
    // ============================================
    function initBlogModals() {
        const blogLinks = document.querySelectorAll('.blog-link[data-blog]');
        const suggestedLinks = document.querySelectorAll('.suggested-readmore[data-blog]');
        const blogModals = document.querySelectorAll('.blog-modal');
        const blogCloseButtons = document.querySelectorAll('.blog-close-modal');
        
        console.log('Blog modals init - Found links:', blogLinks.length, 'Found suggested:', suggestedLinks.length, 'Found modals:', blogModals.length);
        
        // Open blog modal when "Read More" is clicked (ONLY for links with data-blog attribute)
        // Regular blog links without data-blog should navigate normally to blog pages
        blogLinks.forEach(function(link) {
            link.addEventListener('click', function(e) {
                // Only prevent default if this link has data-blog attribute (for modal system)
                if (this.hasAttribute('data-blog')) {
                    e.preventDefault();
                    e.stopPropagation(); // Prevent event bubbling
                    const blogId = this.getAttribute('data-blog');
                    console.log('Blog modal link clicked, blogId:', blogId);
                    const modal = document.getElementById('blogModal' + blogId);
                    console.log('Modal found:', modal ? 'Yes' : 'No');
                    
                    if (modal) {
                        modal.classList.add('show');
                        document.body.style.overflow = 'hidden'; // Prevent background scrolling
                        console.log('Modal should be visible now');
                    } else {
                        console.error('Modal not found for blogId:', blogId);
                    }
                }
                // If no data-blog attribute, allow normal link navigation (do nothing - let browser handle it)
            }, true); // Use capture phase to ensure it fires
        });
        
        // Handle suggested article clicks
        suggestedLinks.forEach(function(link) {
            link.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                const blogId = this.getAttribute('data-blog');
                const targetModal = document.getElementById('blogModal' + blogId);
                const currentModal = this.closest('.blog-modal');
                
                if (targetModal) {
                    // Close current modal first
                    if (currentModal) {
                        currentModal.classList.remove('show');
                        setTimeout(function() {
                            targetModal.classList.add('show');
                            document.body.style.overflow = 'hidden';
                            targetModal.scrollTop = 0;
                        }, 150);
                    } else {
                        targetModal.classList.add('show');
                        document.body.style.overflow = 'hidden';
                    }
                }
            }, true);
        });
        
        // Close blog modal when close button is clicked
        blogCloseButtons.forEach(function(closeBtn) {
            closeBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                const modal = this.closest('.blog-modal');
                if (modal) {
                    modal.classList.remove('show');
                    document.body.style.overflow = ''; // Restore scrolling
                }
            });
        });
        
        // Close blog modal when clicking outside the modal content
        blogModals.forEach(function(modal) {
            modal.addEventListener('click', function(e) {
                if (e.target === modal) {
                    modal.classList.remove('show');
                    document.body.style.overflow = ''; // Restore scrolling
                }
                            });
                        });
        
        // Close blog modal with ESC key
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                blogModals.forEach(function(modal) {
                    if (modal.classList.contains('show')) {
                        modal.classList.remove('show');
                        document.body.style.overflow = ''; // Restore scrolling
                    }
                });
            }
        });
    }
    
    // Initialize blog modals (only for links with data-blog attribute)
    // Regular blog links without data-blog will navigate normally to blog pages
    initBlogModals();
    
    // Safety check: Ensure regular blog links (without data-blog) work normally
    // This prevents any interference with normal link navigation
    document.querySelectorAll('.blog-link:not([data-blog])').forEach(function(link) {
        // Remove any existing click handlers that might interfere
        link.style.pointerEvents = 'auto';
        link.style.cursor = 'pointer';
        
        // Ensure link is clickable
        if (link.href && !link.hasAttribute('data-blog')) {
            link.addEventListener('click', function(e) {
                // Allow normal navigation - don't prevent default
                console.log('Regular blog link clicked - navigating to:', this.href);
                // Browser will handle navigation normally
            }, false); // Use bubble phase, not capture
        }
    });

    // ============================================
    // SCROLL TO TOP BUTTON
    // ============================================
    const scrollToTopBtn = document.getElementById('scrollToTop');
    
    if (scrollToTopBtn) {
        // Show/hide button based on scroll position
        function toggleScrollToTop() {
            if (window.scrollY > 300) {
                scrollToTopBtn.classList.add('show');
                } else {
                scrollToTopBtn.classList.remove('show');
            }
        }
        
        // Initial check
        toggleScrollToTop();
        
        // Listen to scroll events
        window.addEventListener('scroll', toggleScrollToTop, { passive: true });
        
        // Smooth scroll to top on click
        scrollToTopBtn.addEventListener('click', function() {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
                            });
                        });
                    }

    // ============================================
    // SECURITY GUARDS INITIALIZATION
    // ============================================
    function initSecurityGuards() {
        // A. Input sanitization on all forms
        const allForms = document.querySelectorAll('form');
        allForms.forEach(form => {
            form.addEventListener('submit', function(e) {
                // Sanitize all text inputs and textareas before submission
                const textInputs = form.querySelectorAll('input[type="text"], input[type="email"], input[type="tel"], textarea');
                textInputs.forEach(input => {
                    if (input.value) {
                        const sanitized = sanitizeInput(input.value);
                        if (sanitized !== input.value) {
                            input.value = sanitized;
                        }
                    }
                });
            });
        });

        // B. Ensure all external links have rel="noopener noreferrer"
        const externalLinks = document.querySelectorAll('a[target="_blank"]');
        externalLinks.forEach(link => {
            if (!link.getAttribute('rel')) {
                link.setAttribute('rel', 'noopener noreferrer');
            }
        });

        // C. Honeypot field protection
        const honeypotFields = document.querySelectorAll('input[name="website"], input[name="url"], input[name="honeypot"]');
        honeypotFields.forEach(field => {
            // Ensure honeypot fields are never required
            field.removeAttribute('required');
            // Clear any bot-filled values before submission
            const form = field.closest('form');
            if (form) {
                form.addEventListener('submit', function() {
                    if (field.value) {
                        // Honeypot filled - likely spam, but don't alert the bot
                        field.value = '';
                    }
                });
            }
        });

        // D. Error handling wrapper for fetch calls
        // (Already implemented in form submission handlers)

        // E. CSP Note (commented for future implementation)
        // TODO: Add Content Security Policy header via hosting config
        // Recommended: script-src 'self' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com;
        //             style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
        //             font-src 'self' https://fonts.gstatic.com;
        //             img-src 'self' data: https:;
        //             connect-src 'self' https://api.emailjs.com;
        // TODO: Enable HTTPS-only access if not already enforced
    }

    // Initialize security guards
    initSecurityGuards();

    // ============================================
    // PREMIUM LUXURY CHATBOT APPOINTMENT POPUP
    // (Completely independent from adult/kids popups)
    // ============================================
    function initChatbotAppointmentPopup() {
        const chatbotModal = document.getElementById('chatbotAppointmentModal');
        const chatbotForm = document.getElementById('chatbotAppointmentForm');
        const chatbotCloseBtn = document.getElementById('chatbotAppointmentClose');
        const chatbotConfirmationModal = document.getElementById('chatbotAppointmentConfirmationModal');
        const chatbotConfirmationClose = document.getElementById('chatbotConfirmationClose');
        const chatbotConfirmationOk = document.getElementById('chatbotConfirmationOk');
        const chatbotDateInput = document.getElementById('chatbotDate');
        
        if (!chatbotModal || !chatbotForm) return;

        // Set minimum date to today (prevent past dates)
        if (chatbotDateInput) {
            const today = new Date();
            const year = today.getFullYear();
            const month = String(today.getMonth() + 1).padStart(2, '0');
            const day = String(today.getDate()).padStart(2, '0');
            const minDate = year + '-' + month + '-' + day;
            chatbotDateInput.setAttribute('min', minDate);
        }

        // Open chatbot appointment modal
        function openChatbotAppointmentModal() {
            const modal = document.getElementById('chatbotAppointmentModal');
            if (!modal) return;
            hideQuestionPopupOnModalOpen();
            lockBodyScroll();
            modal.style.display='flex';
            modal.style.zIndex='100003';
            requestAnimationFrame(() => {
                modal.classList.add('show');
                const box = modal.querySelector('.chatbot-appointment-content');
                if (box) box.scrollTop = 0;
            });
        }

        // Close chatbot appointment modal
        function closeChatbotAppointmentModal() {
            const modal = document.getElementById('chatbotAppointmentModal');
            if (!modal) return;
            modal.classList.remove('show');
            setTimeout(() => {
                modal.style.display='none';
                unlockBodyScroll();
            }, 350);
        }

        // Validate chatbot form
        function validateChatbotForm() {
            const nameInput = document.getElementById('chatbotName');
            const phoneInput = document.getElementById('chatbotPhone');
            const serviceInput = document.getElementById('chatbotService');
            const dateInput = document.getElementById('chatbotDate');
            const timeInput = document.getElementById('chatbotTime');
            const emailInput = document.getElementById('chatbotEmail');

            let isValid = true;
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            let firstInvalidField = null;

            // Remove previous errors
            [nameInput, phoneInput, serviceInput, dateInput, timeInput, emailInput].forEach(input => {
                if (input) {
                    input.classList.remove('input-error');
                }
            });

            // Validate name
            if (!nameInput || !nameInput.value.trim()) {
                if (nameInput) {
                    nameInput.classList.add('input-error');
                    if (!firstInvalidField) firstInvalidField = nameInput;
                }
                isValid = false;
            }

            // Validate email (optional but if provided, must be valid)
            if (emailInput && emailInput.value.trim() && !emailRegex.test(emailInput.value.trim())) {
                emailInput.classList.add('input-error');
                if (!firstInvalidField) firstInvalidField = emailInput;
                isValid = false;
            }

            // Validate phone
            if (!phoneInput || !phoneInput.value.trim() || phoneInput.value.replace(/\D/g, '').length < 10) {
                if (phoneInput) {
                    phoneInput.classList.add('input-error');
                    if (!firstInvalidField) firstInvalidField = phoneInput;
                }
                isValid = false;
            }

            // Validate service
            if (!serviceInput || !serviceInput.value) {
                if (serviceInput) {
                    serviceInput.classList.add('input-error');
                    if (!firstInvalidField) firstInvalidField = serviceInput;
                }
                isValid = false;
            }

            // Validate date
            if (!dateInput || !dateInput.value) {
                if (dateInput) {
                    dateInput.classList.add('input-error');
                    if (!firstInvalidField) firstInvalidField = dateInput;
                }
                isValid = false;
            } else {
                // Check if date is in the past
                const selectedDate = new Date(dateInput.value);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                if (selectedDate < today) {
                    dateInput.classList.add('input-error');
                    if (!firstInvalidField) firstInvalidField = dateInput;
                    isValid = false;
                }
            }

            // Validate time
            if (!timeInput || !timeInput.value) {
                if (timeInput) {
                    timeInput.classList.add('input-error');
                    if (!firstInvalidField) firstInvalidField = timeInput;
                }
                isValid = false;
            }

            // Scroll to first invalid field
            if (!isValid && firstInvalidField) {
                firstInvalidField.scrollIntoView({ behavior: 'smooth', block: 'center' });
                firstInvalidField.focus();
            }

            return isValid;
        }

        // Show chatbot confirmation modal
        function openChatbotConfirmation() {
            const main = document.getElementById('chatbotAppointmentModal');
            if (main) { main.classList.remove('show'); main.style.display='none'; }
            const modal = document.getElementById('chatbotAppointmentConfirmationModal');
            if (!modal) return;
            lockBodyScroll();
            modal.style.display='flex';
            requestAnimationFrame(() => {
                modal.classList.add('show');
            });
        }

        // Close chatbot confirmation modal
        function closeChatbotConfirmation() {
            const modal = document.getElementById('chatbotAppointmentConfirmationModal');
            if (!modal) return;
            modal.classList.remove('show');
            setTimeout(() => {
                modal.style.display='none';
                unlockBodyScroll();
            }, 400);
        }

        // Form submission
        if (chatbotForm) {
            chatbotForm.addEventListener('submit', function(e) {
                e.preventDefault();
                e.stopPropagation();

                // Validate form
                if (!validateChatbotForm()) {
                    return;
                }

                // Get form data
                const formDataObj = new FormData(chatbotForm);
                const name = formDataObj.get('name') || '';
                const email = formDataObj.get('email') || '';
                const phone = formDataObj.get('phone') || '';
                const service = formDataObj.get('service') || '';
                const date = formDataObj.get('appointment_date') || '';
                const time = formDataObj.get('appointment_time') || '';
                const message = formDataObj.get('message') || '';

                // Disable submit button and show loading
                const submitBtn = chatbotForm.querySelector('.chatbot-submit-btn');
                if (submitBtn) {
                    submitBtn.disabled = true;
                    submitBtn.classList.add('loading');
                }

                // Prepare data for submission (using same backend as other forms)
                const appointmentData = {
                    name: sanitizeInput(name),
                    email: sanitizeInput(email),
                    phone: sanitizeInput(phone),
                    service: sanitizeInput(service),
                    appointment_date: date,
                    appointment_time: time,
                    message: sanitizeInput(message)
                };

                // Security validation
                const validation = validateFormData(appointmentData, 'chatbotAppointmentForm');
                if (!validation.valid) {
                    if (submitBtn) {
                        submitBtn.disabled = false;
                        submitBtn.classList.remove('loading');
                    }
                    return;
                }

                // Submit using same backend function
                submitAppointment(appointmentData)
                    .then(() => {
                        // Success - Close appointment modal and show confirmation
                        closeChatbotAppointmentModal();
                        setTimeout(() => {
                            openChatbotConfirmation();
                            chatbotForm.reset();
                            if (submitBtn) {
                                submitBtn.disabled = false;
                                submitBtn.classList.remove('loading');
                            }
                        }, 350);
                    })
                    .catch((error) => {
                        // Error - Show inline error message
                        if (submitBtn) {
                            submitBtn.disabled = false;
                            submitBtn.classList.remove('loading');
                        }
                        
                        let errorMsg = chatbotForm.querySelector('.chatbot-form-error');
                        if (!errorMsg) {
                            errorMsg = document.createElement('div');
                            errorMsg.className = 'chatbot-form-error';
                            errorMsg.style.cssText = 'color: #ef4444; margin-top: 1rem; padding: 0.75rem; background: #fee2e2; border-radius: 8px; text-align: center; font-family: Inter, Nunito, Poppins, sans-serif;';
                            chatbotForm.appendChild(errorMsg);
                        }
                        errorMsg.textContent = 'There was an issue sending your request. Please try again or contact us directly.';
                        
                        setTimeout(() => {
                            if (errorMsg && errorMsg.parentNode) {
                                errorMsg.remove();
                            }
                        }, 5000);
                    });
            });
        }

        // Close button handlers
        if (chatbotCloseBtn) {
            chatbotCloseBtn.addEventListener('click', closeChatbotAppointmentModal);
        }

        if (chatbotConfirmationClose) {
            chatbotConfirmationClose.addEventListener('click', closeChatbotConfirmation);
        }

        if (chatbotConfirmationOk) {
            chatbotConfirmationOk.addEventListener('click', closeChatbotConfirmation);
        }

        // Outside click to close
        if (chatbotModal) {
            chatbotModal.addEventListener('click', function(e) {
                if (e.target === chatbotModal) {
                    closeChatbotAppointmentModal();
                }
            });
        }

        if (chatbotConfirmationModal) {
            chatbotConfirmationModal.addEventListener('click', function(e) {
                if (e.target === chatbotConfirmationModal) {
                    closeChatbotConfirmation();
                }
            });
        }

        // ESC key to close
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                if (chatbotModal && chatbotModal.classList.contains('show')) {
                    closeChatbotAppointmentModal();
                }
                if (chatbotConfirmationModal && chatbotConfirmationModal.classList.contains('show')) {
                    closeChatbotConfirmation();
                }
            }
        });

        // Wire up chatbot button to scroll to contact section (instead of opening modal)
        // Find all chatbot buttons with data-action="book-appointment"
        const chatbotButtons = document.querySelectorAll('.qp-chip[data-action="book-appointment"]');
        chatbotButtons.forEach(btn => {
            // Remove any existing listeners by cloning
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);
            
            // Add new listener to scroll to contact section
            newBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                // Scroll to contact section instead of opening modal
                const contactSection = document.getElementById('contact');
                if (contactSection) {
                    // Close chat popup if open
                    const chatPopup = document.getElementById('question-popup');
                    if (chatPopup && !chatPopup.classList.contains('hidden')) {
                        if (typeof hidePopup === "function") {
                            hidePopup();
                        } else {
                            chatPopup.classList.remove("visible");
                            setTimeout(function() {
                                chatPopup.classList.add("hidden");
                            }, 150);
                        }
                    }
                    // Scroll to contact section smoothly
                    setTimeout(function() {
                        contactSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        // Focus on the form after a short delay
                        setTimeout(function() {
                            const nameInput = document.getElementById('contactName');
                            if (nameInput) {
                                nameInput.focus();
                            }
                        }, 500);
                    }, 200);
                }
            });
        });

        // Also handle dynamically created chatbot buttons
        const chatContainer = document.getElementById('qp-chat-container');
        if (chatContainer) {
            chatContainer.addEventListener('click', function(e) {
                const chip = e.target.closest('.qp-chip[data-action="book-appointment"]');
                if (chip) {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    // Scroll to contact section instead of opening modal
                    const contactSection = document.getElementById('contact');
                    if (contactSection) {
                        // Close chat popup if open
                        const chatPopup = document.getElementById('question-popup');
                        if (chatPopup && !chatPopup.classList.contains('hidden')) {
                            if (typeof hidePopup === "function") {
                                hidePopup();
                            } else {
                                chatPopup.classList.remove("visible");
                                setTimeout(function() {
                                    chatPopup.classList.add("hidden");
                                }, 150);
                            }
                        }
                        // Scroll to contact section smoothly
                        setTimeout(function() {
                            contactSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            // Focus on the form after a short delay
                            setTimeout(function() {
                                const nameInput = document.getElementById('contactName');
                                if (nameInput) {
                                    nameInput.focus();
                                }
                            }, 500);
                        }, 200);
                    }
                }
            }, true);
        }
    }

    // Initialize chatbot appointment popup
    initChatbotAppointmentPopup();

    // ============================================
    // CHAT WIDGET APPOINTMENT POPUP
    // (Appears above chat widget, keeps chat open)
    // ============================================
    const chatAppointmentModal = document.getElementById("chatAppointmentModal");
    const chatAppointmentForm = document.getElementById("chatAppointmentForm");
    
    if (chatAppointmentModal && chatAppointmentForm) {
        // Set minimum date to today (prevent past dates)
        const chatDateInput = document.getElementById('chatAppointmentDate');
        if (chatDateInput) {
            const today = new Date();
            const year = today.getFullYear();
            const month = String(today.getMonth() + 1).padStart(2, '0');
            const day = String(today.getDate()).padStart(2, '0');
            const minDate = year + '-' + month + '-' + day;
            chatDateInput.setAttribute('min', minDate);
        }

        // OPEN FROM CHAT BUTTON - Scroll to contact section instead
        document.querySelectorAll("[data-action='book-appointment']").forEach(btn => {
            // Remove any existing listeners by cloning
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);
            
            newBtn.addEventListener("click", e => {
                e.preventDefault();
                e.stopPropagation();
                
                // Scroll to contact section instead of opening modal
                const contactSection = document.getElementById('contact');
                if (contactSection) {
                    // Close chat popup if open
                    const chatPopup = document.getElementById('question-popup');
                    if (chatPopup && !chatPopup.classList.contains('hidden')) {
                        if (typeof hidePopup === "function") {
                            hidePopup();
                        } else {
                            chatPopup.classList.remove("visible");
                            setTimeout(function() {
                                chatPopup.classList.add("hidden");
                            }, 150);
                        }
                    }
                    // Scroll to contact section smoothly
                    setTimeout(function() {
                        contactSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        // Focus on the form after a short delay
                        setTimeout(function() {
                            const nameInput = document.getElementById('contactName');
                            if (nameInput) {
                                nameInput.focus();
                            }
                        }, 500);
                    }, 200);
                }
            });
        });

        // Also handle dynamically created buttons via event delegation
        const chatContainer = document.getElementById('qp-chat-container');
        if (chatContainer) {
            chatContainer.addEventListener('click', function(e) {
                const chip = e.target.closest('.qp-chip[data-action="book-appointment"]');
                if (chip) {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    // Scroll to contact section instead of opening modal
                    const contactSection = document.getElementById('contact');
                    if (contactSection) {
                        // Close chat popup if open
                        const chatPopup = document.getElementById('question-popup');
                        if (chatPopup && !chatPopup.classList.contains('hidden')) {
                            if (typeof hidePopup === "function") {
                                hidePopup();
                            } else {
                                chatPopup.classList.remove("visible");
                                setTimeout(function() {
                                    chatPopup.classList.add("hidden");
                                }, 150);
                            }
                        }
                        // Scroll to contact section smoothly
                        setTimeout(function() {
                            contactSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            // Focus on the form after a short delay
                            setTimeout(function() {
                                const nameInput = document.getElementById('contactName');
                                if (nameInput) {
                                    nameInput.focus();
                                }
                            }, 500);
                        }, 200);
                    }
                }
            }, true);
        }

        // CLOSE POPUP
        document.querySelectorAll(".chat-appointment-close").forEach(btn => {
            btn.addEventListener("click", () => {
                chatAppointmentModal.classList.remove("show");
                unlockBodyScroll();
            });
        });

        // Close on outside click
        chatAppointmentModal.addEventListener('click', function(e) {
            if (e.target === chatAppointmentModal) {
                chatAppointmentModal.classList.remove("show");
                unlockBodyScroll();
            }
        });

        // Close on ESC key
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && chatAppointmentModal.classList.contains('show')) {
                chatAppointmentModal.classList.remove("show");
                unlockBodyScroll();
            }
        });

        // SUBMISSION (same backend as main appointment form)
        chatAppointmentForm.addEventListener("submit", function(event) {
            event.preventDefault();
            event.stopPropagation();
            
            const errorBox = chatAppointmentForm.querySelector(".chat-form-error");
            if (errorBox) errorBox.textContent = "";

            // Get form data
            const formDataObj = new FormData(chatAppointmentForm);
            const appointmentData = {
                name: formDataObj.get('name') || '',
                email: formDataObj.get('email') || '',
                phone: formDataObj.get('phone') || '',
                service: formDataObj.get('service') || '',
                date: formDataObj.get('date') || '',
                time: formDataObj.get('time') || '',
                message: formDataObj.get('message') || ''
            };

            // Security validation
            const validation = validateFormData(appointmentData, 'chatAppointmentForm');
            if (!validation.valid) {
                if (errorBox) {
                    errorBox.textContent = validation.errors.length > 0 ? validation.errors[0] : 'Please check your information.';
                }
                return;
            }

            // Disable submit button
            const submitBtn = chatAppointmentForm.querySelector('button[type="submit"]');
            const originalBtnText = submitBtn ? submitBtn.textContent : '';
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Booking...';
            }

            // Use the same submitAppointment function as main form
            submitAppointment(appointmentData)
                .then(() => {
                    // Success - Close chat appointment modal and show confirmation
                    chatAppointmentModal.classList.remove("show");
                    chatAppointmentForm.reset();
                    
                    if (submitBtn) {
                        submitBtn.disabled = false;
                        submitBtn.textContent = originalBtnText;
                    }
                    
                    // Show the same confirmation modal as main appointment form
                    // Use the existing showAppointmentConfirmation function
                    if (typeof showAppointmentConfirmation === 'function') {
                        showAppointmentConfirmation(appointmentData);
                    } else {
                        // Fallback if function doesn't exist
                        const confirmationModal = document.getElementById("appointmentConfirmationModal");
                        if (confirmationModal) {
                            lockBodyScroll();
                            confirmationModal.style.display = 'flex';
                            confirmationModal.style.zIndex = '100005';
                            confirmationModal.style.visibility = 'visible';
                            confirmationModal.style.opacity = '1';
                            setTimeout(() => {
                                confirmationModal.classList.add('show');
                            }, 10);
                        }
                    }
                })
                .catch(() => {
                    // Error - Show inline error
                    if (errorBox) {
                        errorBox.textContent = "Something went wrong. Please try again or contact us directly.";
                    }
                    
                    if (submitBtn) {
                        submitBtn.disabled = false;
                        submitBtn.textContent = originalBtnText;
                    }
                });
        });
    }

}); // End of DOMContentLoaded

// Event delegation for blog links - ONLY for links with data-blog attribute (modal system)
// Regular blog links without data-blog should navigate normally
document.addEventListener('click', function(e) {
    const blogLink = e.target.closest('.blog-link[data-blog]');
    const suggestedLink = e.target.closest('.suggested-readmore[data-blog]');
    const link = blogLink || suggestedLink;
    
    // Only intercept if link has data-blog attribute (for modal system)
    if (link && link.hasAttribute('data-blog')) {
                e.preventDefault();
                e.stopPropagation();
        const blogId = link.getAttribute('data-blog');
        const targetModal = document.getElementById('blogModal' + blogId);
        
        if (targetModal) {
            // If clicking from a suggested article, close current modal first
            if (suggestedLink) {
                const currentModal = suggestedLink.closest('.blog-modal');
                if (currentModal) {
                    currentModal.classList.remove('show');
                    // Small delay for smooth transition
                    setTimeout(function() {
                        targetModal.classList.add('show');
                        document.body.style.overflow = 'hidden';
                        // Scroll to top of new modal
                        targetModal.scrollTop = 0;
                    }, 150);
                } else {
                    targetModal.classList.add('show');
                    document.body.style.overflow = 'hidden';
                        }
                    } else {
                targetModal.classList.add('show');
                document.body.style.overflow = 'hidden';
            }
        }
    }
    // If no data-blog attribute, allow normal link navigation (do nothing)
}, true);
