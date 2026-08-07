document.addEventListener('DOMContentLoaded', () => {
    let displayName = 'Player';
    let displayAvatar = 'images/avatar.avif';
    try {
        const cached = localStorage.getItem('chat_identity');
        if (cached) {
            const parsed = JSON.parse(cached);
            if (parsed && parsed.user) {
                if (parsed.user.name) {
                    displayName = parsed.user.name;
                }
                if (parsed.user.avatar) {
                    displayAvatar = parsed.user.avatar;
                } else {
                    displayAvatar = 'images/avatar.avif';
                }
            }
        }
    } catch (_) {}

    const hasAgentIdentity = !!localStorage.getItem('agent_identity');
    const backToAdminBtnHtml = hasAgentIdentity ? `
      <button id="btn-back-to-admin" class="hidden md:flex items-center gap-2 bg-secondary-fixed-dim/20 hover:bg-secondary-fixed-dim/30 text-secondary-fixed-dim px-4 py-1.5 rounded-full border border-secondary-fixed-dim/30 transition-all font-semibold text-xs cursor-pointer">
        <span class="material-symbols-outlined text-[16px]">admin_panel_settings</span>
        BACK TO ADMIN
      </button>
    ` : '';

    const mobileBackToAdminBtnHtml = hasAgentIdentity ? `
      <button id="mobile-btn-back-to-admin" class="flex items-center gap-3 p-3 rounded-lg text-secondary-fixed-dim bg-secondary-fixed-dim/10 hover:bg-secondary-fixed-dim/20 transition-colors text-left w-full cursor-pointer">
        <span class="material-symbols-outlined">admin_panel_settings</span>
        <span class="font-label-caps text-label-caps font-semibold">BACK TO ADMIN</span>
      </button>
    ` : '';

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
    ${backToAdminBtnHtml}
    <div class="relative">
      <!-- Desktop Profile Trigger -->
      <div id="profile-trigger-desktop" class="hidden md:flex items-center gap-3 bg-surface-container px-4 py-1.5 rounded-full border border-white/10 cursor-pointer hover:border-primary/30 transition-all select-none">
        <span class="font-label-caps text-primary font-bold">${displayName}</span>
        <div class="w-8 h-8 rounded-full overflow-hidden border border-primary/20">
          <img src="${displayAvatar}" alt="${displayName}" class="w-full h-full object-cover" onerror="this.onerror=null; this.src='images/avatar.avif';">
        </div>
        <span class="material-symbols-outlined text-text-muted text-[18px]">keyboard_arrow_down</span>
      </div>

      <!-- Mobile Profile Trigger -->
      <div id="profile-trigger-mobile" class="md:hidden w-10 h-10 rounded-full overflow-hidden border-2 border-primary/20 hover:border-primary/50 transition-colors cursor-pointer">
        <img src="${displayAvatar}" alt="${displayName}" class="w-full h-full object-cover" onerror="this.onerror=null; this.src='images/avatar.avif';">
      </div>

      <!-- Dropdown Menu -->
      <div id="profile-dropdown" class="hidden absolute right-0 mt-2 w-48 rounded-xl shadow-2xl py-2 z-50 border border-white/10" style="background: rgba(23, 26, 33, 0.95); backdrop-filter: blur(12px); box-shadow: 0 10px 25px -5px rgba(0,0,0,0.5);">
        <a href="#" id="menu-profile" class="flex items-center gap-3 px-4 py-2.5 text-sm text-text-muted hover:text-text-primary hover:bg-white/5 transition-colors">
          <span class="material-symbols-outlined text-[20px]">person</span>
          <span class="font-semibold">Profile</span>
        </a>
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
          <img src="${displayAvatar}" alt="${displayName}" class="w-full h-full object-cover" onerror="this.onerror=null; this.src='images/avatar.avif';">
        </div>
        <div class="flex flex-col">
          <span class="font-semibold text-primary text-sm">${displayName}</span>
          <span class="text-[10px] text-text-muted uppercase tracking-wider font-bold">Player</span>
        </div>
      </div>

      <nav class="flex flex-col gap-4">
        ${mobileBackToAdminBtnHtml}
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
        <a href="#" id="mobile-menu-profile" class="flex items-center gap-3 py-2 text-text-muted hover:text-primary transition-colors">
          <span class="material-symbols-outlined text-[20px]">person</span>
          <span class="font-semibold text-sm">Profile</span>
        </a>
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

    // Inject profile modal HTML to body if it doesn't exist
    if (!document.getElementById('profileModal')) {
        // Inject media query styles if not present
        if (!document.getElementById('profileModalStyles')) {
            const style = document.createElement('style');
            style.id = 'profileModalStyles';
            style.innerHTML = `
              @media (max-width: 640px) {
                .profile-modal-card-navbar {
                  max-width: 360px !important;
                }
                .profile-modal-split-navbar {
                  flex-direction: column !important;
                }
                .profile-modal-split-navbar > div:first-child {
                  padding: 1.5rem 1rem !important;
                  min-height: auto !important;
                }
                .profile-modal-split-navbar > div:last-child {
                  padding: 1.5rem 1rem !important;
                }
              }
            `;
            document.head.appendChild(style);
        }

        const modalDiv = document.createElement('div');
        modalDiv.innerHTML = `
  <div id="profileModal" class="profile-modal" style="display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.65); backdrop-filter: blur(10px); z-index: 10000; align-items: center; justify-content: center; opacity: 0; transition: opacity 0.25s ease; padding: 1rem;">
    <div class="profile-modal-card profile-modal-card-navbar" style="background: #ffffff; border-radius: 20px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); width: 100%; max-width: 650px; overflow: hidden; transform: scale(0.9); transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1); border: 1px solid rgba(0,0,0,0.05); display: flex; flex-direction: column; position: relative;">
      
      <button id="closeProfileModalBtn" style="position: absolute; top: 16px; right: 16px; background: rgba(0,0,0,0.05); border: none; width: 32px; height: 32px; border-radius: 50%; color: #333333; font-size: 1rem; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; z-index: 10;" onmouseover="this.style.background='rgba(0,0,0,0.1)'" onmouseout="this.style.background='rgba(0,0,0,0.05)'">✕</button>

      <div class="profile-modal-split profile-modal-split-navbar" style="display: flex; flex-direction: row; min-height: 380px;">
        
        <!-- Left Pane: Picture & Header Banner -->
        <div style="flex: 1; min-width: 240px; background: linear-gradient(135deg, #008069, #016b57); display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 2rem 1.5rem; text-align: center; color: #ffffff;">
          <div style="width: 160px; height: 160px; border-radius: 50%; border: 5px solid rgba(255,255,255,0.25); overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.2); background: #ffffff; margin-bottom: 1rem;">
            <img id="modalProfileImg" src="images/avatar.avif" alt="Avatar" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.onerror=null; this.src='images/avatar.avif';" />
          </div>
          <h3 id="modalProfileName" style="font-size: 1.4rem; font-weight: 700; margin: 0; color: #ffffff; text-shadow: 0 2px 4px rgba(0,0,0,0.15);">Name</h3>
          <span id="modalProfileRoleBadge" style="background: rgba(255,255,255,0.2); color: #ffffff; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; padding: 0.3rem 0.8rem; border-radius: 20px; margin-top: 0.5rem; letter-spacing: 0.05em; border: 1px solid rgba(255,255,255,0.3);">Role</span>
        </div>

        <!-- Right Pane: Details -->
        <div style="flex: 1.3; padding: 2.5rem 2rem; display: flex; flex-direction: column; justify-content: center; background: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
          <h4 style="font-size: 1.1rem; font-weight: 700; color: #1e293b; margin: 0 0 1.5rem 0; border-bottom: 2px solid #f1f5f9; padding-bottom: 0.5rem; letter-spacing: -0.01em;">Account Information</h4>
          
          <div style="display: flex; flex-direction: column; gap: 1.2rem;">
            <div style="display: flex; align-items: flex-start; gap: 1rem;">
              <span style="font-size: 1.5rem; line-height: 1.2;">📱</span>
              <div style="display: flex; flex-direction: column;">
                <span style="font-size: 0.7rem; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.15rem;">Mobile Number</span>
                <span id="modalProfilePhone" style="font-size: 0.95rem; font-weight: 600; color: #1e293b;">Not Provided</span>
              </div>
            </div>

            <div style="display: flex; align-items: flex-start; gap: 1rem;">
              <span style="font-size: 1.5rem; line-height: 1.2;">✉️</span>
              <div style="display: flex; flex-direction: column;">
                <span style="font-size: 0.7rem; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.15rem;">Email / ID</span>
                <span id="modalProfileEmail" style="font-size: 0.95rem; font-weight: 600; color: #1e293b;">Not Provided</span>
              </div>
            </div>

            <div id="modalProfileAgentRow" style="display: flex; align-items: flex-start; gap: 1rem;">
              <span style="font-size: 1.5rem; line-height: 1.2;">🛡️</span>
              <div style="display: flex; flex-direction: column;">
                <span style="font-size: 0.7rem; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.15rem;">Agent/Agency Code</span>
                <span id="modalProfileAgent" style="font-size: 0.95rem; font-weight: 600; color: #1e293b;">Not Assigned</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  </div>
        `;
        document.body.appendChild(modalDiv.firstElementChild);

        // Bind close button handler
        document.getElementById('closeProfileModalBtn').addEventListener('click', closeProfileModal);
    }

    const showProfileModal = () => {
      const cached = localStorage.getItem('chat_identity');
      if (!cached) return;
      try {
        const parsed = JSON.parse(cached);
        const user = parsed.user;
        if (!user) return;
        
        document.getElementById('modalProfileImg').src = user.avatar || 'images/avatar.avif';
        document.getElementById('modalProfileName').textContent = user.name || 'User';
        
        const roleBadge = document.getElementById('modalProfileRoleBadge');
        roleBadge.textContent = user.role || parsed.role || 'Player';
        if (user.role === 'agent') {
          roleBadge.style.background = '#e8f5e9';
          roleBadge.style.color = '#2e7d32';
        } else if (user.role === 'admin') {
          roleBadge.style.background = '#fff3e0';
          roleBadge.style.color = '#ef6c00';
        } else {
          roleBadge.style.background = '#e1f5fe';
          roleBadge.style.color = '#0288d1';
        }

        document.getElementById('modalProfilePhone').textContent = user.mob || user.mobile || 'Not Provided';
        document.getElementById('modalProfileEmail').textContent = user.emailId || user.email || 'Not Provided';
        
        const agentRow = document.getElementById('modalProfileAgentRow');
        if (user.role === 'user' && user.agentId) {
          agentRow.style.display = 'flex';
          document.getElementById('modalProfileAgent').textContent = user.agentId;
        } else {
          agentRow.style.display = 'none';
        }
        
        const modal = document.getElementById('profileModal');
        modal.style.display = 'flex';
        setTimeout(() => {
          modal.style.opacity = '1';
          modal.querySelector('.profile-modal-card').style.transform = 'scale(1)';
        }, 10);
      } catch (err) {
        console.error('Error opening profile modal:', err);
      }
    };

    function closeProfileModal() {
      const modal = document.getElementById('profileModal');
      if (!modal) return;
      modal.style.opacity = '0';
      modal.querySelector('.profile-modal-card').style.transform = 'scale(0.9)';
      setTimeout(() => {
        modal.style.display = 'none';
      }, 250);
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

        // Profile click
        const btnProfile = document.getElementById('menu-profile');
        if (btnProfile) {
            btnProfile.addEventListener('click', (e) => {
                e.preventDefault();
                dropdown.classList.add('hidden');
                showProfileModal();
            });
        }

        const mobBtnProfile = document.getElementById('mobile-menu-profile');
        if (mobBtnProfile) {
            mobBtnProfile.addEventListener('click', (e) => {
                e.preventDefault();
                if (typeof closeDrawer === 'function') {
                    closeDrawer();
                }
                showProfileModal();
            });
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

    const btnBackToAdmin = document.getElementById('btn-back-to-admin');
    const mobBtnBackToAdmin = document.getElementById('mobile-btn-back-to-admin');

    const handleBackToAdmin = (e) => {
        e.preventDefault();
        const agentIdentity = localStorage.getItem('agent_identity');
        if (agentIdentity) {
            try {
                const parsed = JSON.parse(agentIdentity);
                localStorage.setItem('chat_identity', agentIdentity);
                document.cookie = `token=${parsed.token}; path=/; max-age=${7 * 24 * 60 * 60};`;
                localStorage.removeItem('agent_identity');
                window.location.href = '/admin.html';
            } catch (err) {
                console.error('Failed to restore agent identity:', err);
                window.location.href = '/admin.html';
            }
        } else {
            window.location.href = '/admin.html';
        }
    };

    if (btnBackToAdmin) {
        btnBackToAdmin.addEventListener('click', handleBackToAdmin);
    }
    if (mobBtnBackToAdmin) {
        mobBtnBackToAdmin.addEventListener('click', handleBackToAdmin);
    }
});
