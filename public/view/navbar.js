document.addEventListener('DOMContentLoaded', () => {
    let displayName = 'Player';
    try {
        const cached = localStorage.getItem('chat_identity');
        if (cached) {
            const parsed = JSON.parse(cached);
            if (parsed && parsed.user && parsed.user.name) {
                displayName = parsed.user.name;
            }
        }
    } catch (_) {}

    const navbarHTML = `
    <header class="fixed top-0 w-full h-[70px] z-50 bg-surface/80 backdrop-blur-xl shadow-sm border-b border-white/5">
    <div class="flex justify-between items-center px-6 h-full max-w-[1440px] mx-auto relative">
    <div class="font-headline-lg-mobile text-headline-lg font-bold text-primary">
                        LuxeBet
                    </div>
    <nav class="hidden md:flex gap-8 items-center absolute left-1/2 -translate-x-1/2">
    <a id="nav-home" href="home.html" class="flex items-center gap-2 text-text-muted hover:text-primary transition-colors">
    <span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 0;">home</span>
    <span class="font-label-caps text-label-caps">HOME</span>
    </a>
    <a id="nav-recharge" href="recharge.html" class="flex items-center gap-2 text-text-muted hover:text-primary transition-colors">
    <span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 0;">account_balance_wallet</span>
    <span class="font-label-caps text-label-caps">RECHARGE</span>
    </a>
    <a id="nav-records" href="records.html" class="flex items-center gap-2 text-text-muted hover:text-primary transition-colors">
    <span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 0;">history</span>
    <span class="font-label-caps text-label-caps">HISTORY</span>
    </a>
    </nav>
    <div class="flex items-center gap-4">
    <div class="relative">
      <!-- Desktop Profile Trigger -->
      <div id="profile-trigger-desktop" class="hidden md:flex items-center gap-3 bg-surface-container px-4 py-1.5 rounded-full border border-white/10 cursor-pointer hover:border-primary/30 transition-all select-none">
        <span class="font-label-caps text-primary font-bold">${displayName}</span>
        <div class="w-8 h-8 rounded-full overflow-hidden border border-primary/20">
          <img src="images/avatar.png" alt="${displayName}" class="w-full h-full object-cover">
        </div>
        <span class="material-symbols-outlined text-text-muted text-[18px]">keyboard_arrow_down</span>
      </div>

      <!-- Mobile Profile Trigger -->
      <div id="profile-trigger-mobile" class="md:hidden w-10 h-10 rounded-full overflow-hidden border-2 border-primary/20 hover:border-primary/50 transition-colors cursor-pointer">
        <img src="images/avatar.png" alt="${displayName}" class="w-full h-full object-cover">
      </div>

      <!-- Dropdown Menu -->
      <div id="profile-dropdown" class="hidden absolute right-0 mt-2 w-48 rounded-xl shadow-2xl py-2 z-50 border border-white/10" style="background: rgba(23, 26, 33, 0.95); backdrop-filter: blur(12px); box-shadow: 0 10px 25px -5px rgba(0,0,0,0.5);">
        <a href="#" id="menu-settings" class="flex items-center gap-3 px-4 py-2.5 text-sm text-text-muted hover:text-text-primary hover:bg-white/5 transition-colors">
          <span class="material-symbols-outlined text-[20px]">settings</span>
          <span class="font-semibold">Settings</span>
        </a>
        <div class="h-px bg-white/5 my-1"></div>
        <a href="#" id="menu-logout" class="flex items-center gap-3 px-4 py-2.5 text-sm transition-colors" style="color: #ffb4ab;">
          <span class="material-symbols-outlined text-[20px]">logout</span>
          <span class="font-semibold">Logout</span>
        </a>
      </div>
    </div>

    <button id="mobile-menu-btn" class="md:hidden text-on-surface-variant hover:opacity-80 transition-opacity flex items-center justify-center">
    <span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 0;">menu</span>
    </button>
    </div>
    </div>
    </header>

    <!-- Mobile Drawer Backdrop -->
    <div id="mobile-drawer-overlay" class="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300 opacity-0 pointer-events-none"></div>

    <!-- Mobile Drawer Menu -->
    <div id="mobile-drawer" class="fixed inset-y-0 right-0 z-50 w-64 bg-[#1e1f26]/95 backdrop-blur-xl border-l border-white/10 p-6 flex flex-col gap-6 shadow-2xl transition-transform duration-300 transform translate-x-full">
      <div class="flex justify-between items-center pb-4 border-b border-white/10">
        <span class="font-headline-lg-mobile text-headline-lg-mobile font-bold text-primary">LuxeBet Navigation</span>
        <button id="mobile-drawer-close" class="text-text-muted hover:text-primary transition-colors flex items-center justify-center">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>
      
      <!-- Mobile User Info -->
      <div class="flex items-center gap-3 bg-[#191b22] p-3 rounded-xl border border-white/5">
        <div class="w-10 h-10 rounded-full overflow-hidden border border-primary/20">
          <img src="images/avatar.png" alt="${displayName}" class="w-full h-full object-cover">
        </div>
        <div class="flex flex-col">
          <span class="font-semibold text-primary text-sm">${displayName}</span>
          <span class="text-[10px] text-text-muted uppercase tracking-wider font-bold">Player</span>
        </div>
      </div>

      <nav class="flex flex-col gap-4">
        <a id="mobile-nav-home" href="home.html" class="flex items-center gap-3 p-3 rounded-lg text-text-muted hover:text-primary hover:bg-white/5 transition-colors">
          <span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 0;">home</span>
          <span class="font-label-caps text-label-caps font-semibold">HOME</span>
        </a>
        <a id="mobile-nav-recharge" href="recharge.html" class="flex items-center gap-3 p-3 rounded-lg text-text-muted hover:text-primary hover:bg-white/5 transition-colors">
          <span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 0;">account_balance_wallet</span>
          <span class="font-label-caps text-label-caps font-semibold">RECHARGE</span>
        </a>
        <a id="mobile-nav-records" href="records.html" class="flex items-center gap-3 p-3 rounded-lg text-text-muted hover:text-primary hover:bg-white/5 transition-colors">
          <span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 0;">history</span>
          <span class="font-label-caps text-label-caps font-semibold">HISTORY</span>
        </a>
      </nav>

      <div class="mt-auto pt-4 border-t border-white/10 flex flex-col gap-3">
        <a href="#" id="mobile-menu-settings" class="flex items-center gap-3 py-2 text-text-muted hover:text-primary transition-colors">
          <span class="material-symbols-outlined text-[20px]">settings</span>
          <span class="font-semibold text-sm">Settings</span>
        </a>
        <a href="#" id="mobile-menu-logout" class="flex items-center gap-3 py-2 text-red-400 hover:text-red-300 transition-colors">
          <span class="material-symbols-outlined text-[20px]">logout</span>
          <span class="font-semibold text-sm">Logout</span>
        </a>
      </div>
    </div>
    `;

    // Inject the navbar into the placeholder
    const placeholder = document.getElementById('navbar-placeholder');
    if (placeholder) {
        placeholder.outerHTML = navbarHTML;
    }

    // Toggle Mobile Drawer
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const mobileDrawer = document.getElementById('mobile-drawer');
    const mobileDrawerOverlay = document.getElementById('mobile-drawer-overlay');
    const mobileDrawerClose = document.getElementById('mobile-drawer-close');

    if (mobileMenuBtn && mobileDrawer && mobileDrawerOverlay) {
        const openDrawer = () => {
            mobileDrawer.classList.remove('translate-x-full');
            mobileDrawer.classList.add('translate-x-0');
            mobileDrawerOverlay.classList.remove('opacity-0', 'pointer-events-none');
            mobileDrawerOverlay.classList.add('opacity-100');
        };

        const closeDrawer = () => {
            mobileDrawer.classList.remove('translate-x-0');
            mobileDrawer.classList.add('translate-x-full');
            mobileDrawerOverlay.classList.remove('opacity-100');
            mobileDrawerOverlay.classList.add('opacity-0', 'pointer-events-none');
        };

        mobileMenuBtn.addEventListener('click', openDrawer);
        if (mobileDrawerClose) {
            mobileDrawerClose.addEventListener('click', closeDrawer);
        }
        mobileDrawerOverlay.addEventListener('click', closeDrawer);
        
        // Settings click inside mobile drawer
        const mobileBtnSettings = document.getElementById('mobile-menu-settings');
        if (mobileBtnSettings) {
            mobileBtnSettings.addEventListener('click', (e) => {
                e.preventDefault();
                alert('Settings panel is under development.');
                closeDrawer();
            });
        }

        // Logout click inside mobile drawer
        const mobileBtnLogout = document.getElementById('mobile-menu-logout');
        if (mobileBtnLogout) {
            mobileBtnLogout.addEventListener('click', (e) => {
                e.preventDefault();
                closeDrawer();
                if (window.widgetLogout) {
                    window.widgetLogout();
                } else {
                    localStorage.removeItem('chat_identity');
                    document.cookie = "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
                    window.location.href = '/';
                }
            });
        }
    }

    // Toggle dropdown
    const triggerDesktop = document.getElementById('profile-trigger-desktop');
    const triggerMobile = document.getElementById('profile-trigger-mobile');
    const dropdown = document.getElementById('profile-dropdown');

    if (triggerDesktop && dropdown) {
        const toggleDropdown = (e) => {
            e.stopPropagation();
            dropdown.classList.toggle('hidden');
        };

        triggerDesktop.addEventListener('click', toggleDropdown);
        if (triggerMobile) {
            triggerMobile.addEventListener('click', toggleDropdown);
        }

        // Settings click
        const btnSettings = document.getElementById('menu-settings');
        if (btnSettings) {
            btnSettings.addEventListener('click', (e) => {
                e.preventDefault();
                alert('Settings panel is under development.');
                dropdown.classList.add('hidden');
            });
        }

        // Logout click
        const btnLogout = document.getElementById('menu-logout');
        if (btnLogout) {
            btnLogout.addEventListener('click', (e) => {
                e.preventDefault();
                dropdown.classList.add('hidden');
                if (window.widgetLogout) {
                    window.widgetLogout();
                } else {
                    localStorage.removeItem('chat_identity');
                    document.cookie = "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
                    window.location.href = '/';
                }
            });
        }

        // Click outside to close
        document.addEventListener('click', (e) => {
            if (!dropdown.classList.contains('hidden') && 
                !e.target.closest('#profile-trigger-desktop') && 
                !e.target.closest('#profile-trigger-mobile') && 
                !e.target.closest('#profile-dropdown')) {
                dropdown.classList.add('hidden');
            }
        });
    }

    // Dynamically set the active class based on the current page URL path
    const path = window.location.pathname;
    const page = path.split("/").pop();

    let activeId = '';
    if (page === 'home.html' || page === '') {
        activeId = 'nav-home';
    } else if (page === 'recharge.html') {
        activeId = 'nav-recharge';
    } else if (page === 'records.html') {
        activeId = 'nav-records';
    }

    if (activeId) {
        const activeLink = document.getElementById(activeId);
        if (activeLink) {
            // Remove inactive classes and add active styling
            activeLink.className = "flex items-center gap-2 text-secondary-fixed-dim drop-shadow-[0_0_8px_rgba(0,228,117,0.5)] transition-transform duration-200";
            const icon = activeLink.querySelector('.material-symbols-outlined');
            if (icon) {
                icon.style.fontVariationSettings = '"FILL" 1';
            }
            const text = activeLink.querySelector('.font-label-caps');
            if (text) {
                text.classList.add('font-bold');
            }
        }

        // Set mobile active link classes
        const mobileActiveLink = document.getElementById('mobile-' + activeId);
        if (mobileActiveLink) {
            mobileActiveLink.classList.remove('text-text-muted');
            mobileActiveLink.classList.add('text-secondary-fixed-dim', 'bg-white/5', 'drop-shadow-[0_0_8px_rgba(0,228,117,0.3)]');
            const icon = mobileActiveLink.querySelector('.material-symbols-outlined');
            if (icon) {
                icon.style.fontVariationSettings = '"FILL" 1';
            }
        }
    }
});
