/**
 * JAVASCRIPT PORTAFOLIO - JUANJOSÉ BÁSCUÑAN
 * Funcionalidades: 
 * - Menú móvil responsivo (Hamburgesa Toggle)
 * - Navegación activa dinámica al hacer Scroll (IntersectionObserver)
 * - Efecto Scroll header (Sticky glassmorphic navbar)
 * - Animaciones de revelado progresivo (Scroll Reveal)
 */

document.addEventListener('DOMContentLoaded', () => {
    
    // --- 1. Menú Móvil (Navbar Toggle) ---
    const navToggle = document.getElementById('navToggle');
    const navLinksContainer = document.querySelector('.nav-links');
    const navLinks = document.querySelectorAll('.nav-links a');

    if (navToggle && navLinksContainer) {
        navToggle.addEventListener('click', () => {
            navLinksContainer.classList.toggle('active');
            
            // Alternar icono de hamburguesa a cruz
            const icon = navToggle.querySelector('i');
            if (icon) {
                icon.classList.toggle('fa-bars');
                icon.classList.toggle('fa-xmark');
            }
        });

        // Cerrar menú al hacer clic en cualquier enlace
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                navLinksContainer.classList.remove('active');
                const icon = navToggle.querySelector('i');
                if (icon) {
                    icon.classList.add('fa-bars');
                    icon.classList.remove('fa-xmark');
                }
            });
        });
    }

    // --- 2. Efecto de Scroll en el Header (Navbar compacta) ---
    const header = document.querySelector('header');
    
    const checkScroll = () => {
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    };

    window.addEventListener('scroll', checkScroll);
    checkScroll(); // Ejecutar al cargar para validar posición actual

    // --- 3. Detección de Sección Activa en el Menú ---
    const sections = document.querySelectorAll('main section');
    
    const activeSectionObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const id = entry.target.getAttribute('id');
                
                // Remover clase active de todos los enlaces
                navLinks.forEach(link => {
                    link.classList.remove('active');
                    if (link.getAttribute('href') === `#${id}`) {
                        link.classList.add('active');
                    }
                });
            }
        });
    }, {
        threshold: 0.25, // Activar cuando al menos el 25% de la sección esté en pantalla
        rootMargin: "-20% 0px -40% 0px" // Ajustar márgenes para una detección natural al centro de la pantalla
    });

    sections.forEach(section => {
        activeSectionObserver.observe(section);
    });

    // --- 4. Animación de Revelado Progresivo (Scroll Reveal) ---
    // Añadimos clases de entrada a secciones y elementos específicos
    const animatableElements = [];
    
    // Elementos a animar
    const sectionsToReveal = document.querySelectorAll('section');
    const timelineItems = document.querySelectorAll('.item-timeline');
    const skillCards = document.querySelectorAll('.categoria-skill');
    const networkCards = document.querySelectorAll('.tarjeta-red');
    const statCards = document.querySelectorAll('.stat-card');

    // Asignar clases de preparación para animación
    sectionsToReveal.forEach(sec => {
        if (sec.id !== 'inicio') { // Excluir la sección hero para que cargue de inmediato
            sec.classList.add('reveal-on-scroll');
            animatableElements.push(sec);
        }
    });

    timelineItems.forEach(item => {
        item.classList.add('reveal-timeline-item');
        animatableElements.push(item);
    });

    skillCards.forEach(card => {
        card.classList.add('reveal-card');
        animatableElements.push(card);
    });

    networkCards.forEach(card => {
        card.classList.add('reveal-card');
        animatableElements.push(card);
    });

    statCards.forEach(card => {
        card.classList.add('reveal-card');
        animatableElements.push(card);
    });

    // Crear estilos CSS inyectados para manejar las animaciones sin peso extra de librería
    const style = document.createElement('style');
    style.innerHTML = `
        /* Estilos de preparación y animación en JS */
        .reveal-on-scroll {
            opacity: 0;
            transform: translateY(40px);
            transition: opacity 0.8s ease, transform 0.8s cubic-bezier(0.16, 1, 0.3, 1);
        }
        
        .reveal-timeline-item {
            opacity: 0;
            transform: translateX(-30px);
            transition: opacity 0.7s ease, transform 0.7s cubic-bezier(0.16, 1, 0.3, 1);
        }
        
        .reveal-card {
            opacity: 0;
            transform: translateY(30px);
            transition: opacity 0.6s ease, transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);
        }
        
        /* Clases activadas por IntersectionObserver */
        .reveal-visible {
            opacity: 1;
            transform: translate(0) !important;
        }
    `;
    document.head.appendChild(style);

    // Observer para animaciones de revelado
    const revealObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('reveal-visible');
                // Dejar de observar una vez animado
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: "0px 0px -50px 0px"
    });

    animatableElements.forEach(element => {
        revealObserver.observe(element);
    });

});
