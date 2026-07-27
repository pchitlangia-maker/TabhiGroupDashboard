import { getLogoSVG } from './logoSVGs.js';

export class UIManager {
  constructor(app) {
    this.app = app;
    this.activeBrand = null;
    this.activeTab = 'overview';
    this.brandData = null; // Stored current brand layout data
    this.tagClassMap = {
      'NDC RELEASE': 'tag-orange',
      'DISTRIBUTION': 'tag-slate',
      'CONTENT DEAL': 'tag-green',
      'SUPPLIER': 'tag-amber',
      'API EXPANSION': 'tag-slate',
      'HOTEL CONTENT': 'tag-slate',
      'PRICING CHG': 'tag-red',
      'CONSOLIDATOR': 'tag-slate',
      'FEATURE LAUNCH': 'tag-slate',
      'GROUP BOOKINGS': 'tag-slate',
      'AGENT PROMO': 'tag-green',
      'OPPORTUNITY': 'tag-orange',
      'EXPANSION': 'tag-orange',
      'B2C LAUNCH': 'tag-orange',
      'PARTNERSHIP': 'tag-green',
      'CAMPAIGN': 'tag-slate',
      'TRAFFIC VELOCITY': 'tag-slate',
      'GROWTH': 'tag-green',
      'ACQUISITION': 'tag-orange',
      'COMMISSION': 'tag-green',
      'NDC PROMO': 'tag-orange',
      'B2B CAMPAIGN': 'tag-slate',
      'MARKET EXP': 'tag-orange',
      'UX TOOL': 'tag-slate',
      'SPECIALTY': 'tag-slate',
      'INTEGRATION': 'tag-slate',
      'CRM SOFTWARE': 'tag-slate',
      'SUPPLIER DIRECT': 'tag-amber',
      'BENEFITS': 'tag-green',
      'TECH DEALS': 'tag-green',
      'GDS SYSTEM': 'tag-slate',
      'PRODUCTIVITY': 'tag-slate',
      'B2B EXPANSION': 'tag-orange',
      'PROMOTION': 'tag-green',
      'AIR PORTAL': 'tag-slate',
      'CRUISE SYSTEM': 'tag-slate',
      'AI SEARCH': 'tag-orange',
      'B2C PORTAL': 'tag-slate',
      'MARKET RADAR': 'tag-slate',
      'AGENT ACCRED': 'tag-slate',
      'TRAINING': 'tag-slate',
      'HOTEL DEALS': 'tag-green',
      'STRESS': 'tag-red',
      'LIQUIDITY': 'tag-red',
      'FINANCE': 'tag-slate',
      'MERGER': 'tag-orange',
      'LEGAL': 'tag-red',
      'REGULATION': 'tag-red',
      'CEO MOVE': 'tag-amber',
      'EXECUTIVE': 'tag-amber',
      
      // Threat Levels
      'HIGH THREAT': 'tag-red',
      'MEDIUM THREAT': 'tag-amber',
      'LOW THREAT': 'tag-green',
      
      // Sentiment
      'POSITIVE': 'tag-green',
      'NEGATIVE': 'tag-red',
      'NEUTRAL': 'tag-slate'
    };
    
    this.columnCards = {};
    this.initClock();
    this.bindGlobalEvents();
    this.activeFilter = 'ALL';
    this.activeSocialPlatformFilter = 'ALL';
  }
  
  showLoading() {
    const portalStatus = document.getElementById('portal-status-text');
    if (portalStatus) {
      portalStatus.textContent = "Ingesting competitive databases...";
    }
  }
  
  initPortal() {
    const portalStatus = document.getElementById('portal-status-text');
    if (portalStatus) {
      portalStatus.style.display = 'none';
    }
    
    // Draw Tabhi logo vector in the portal view
    const portalLogo = document.getElementById('tabhi-logo-portal-svg');
    if (portalLogo) portalLogo.innerHTML = getLogoSVG('tabhi');
    
    // Draw Tabhi dark logo in the dashboard header
    const headerLogo = document.getElementById('header-tabhi-logo');
    if (headerLogo) headerLogo.innerHTML = getLogoSVG('tabhidark');
    
    // Draw Tabhi group sub-logos inside portal cards
    const mondeeLogo = document.getElementById('portal-card-mondee-logo');
    if (mondeeLogo) mondeeLogo.innerHTML = getLogoSVG('mondee');
    
    const miraeeLogo = document.getElementById('portal-card-miraee-logo');
    if (miraeeLogo) miraeeLogo.innerHTML = getLogoSVG('miraee');
    
    const abheeLogo = document.getElementById('portal-card-abhee-logo');
    if (abheeLogo) abheeLogo.innerHTML = getLogoSVG('abhee');
  }
  
  renderBrandDashboard(brandId, brandData) {
    this.activeBrand = brandId;
    const filter = this.activeFilter || 'ALL';
    this.brandData = this.app.dataManager.filterBrandData(brandId, filter);
    const useBrandData = this.brandData;
    
    // Update header logo & titles
    const headerMark = document.getElementById('header-brand-logo-mark');
    if (headerMark) headerMark.innerHTML = getLogoSVG(brandId);
    
    const activeTitle = document.getElementById('active-brand-title');
    if (activeTitle) activeTitle.textContent = useBrandData.title;
    
    const badgeTxt = document.getElementById('header-badge-txt');
    if (badgeTxt) badgeTxt.textContent = useBrandData.headerBadge;
    
    const heroTitle = document.getElementById('hero-title');
    if (heroTitle) heroTitle.textContent = useBrandData.heroTitle;
    
    const heroDesc = document.getElementById('hero-description');
    if (heroDesc) heroDesc.textContent = useBrandData.heroDesc;
    
    const footerTxt = document.getElementById('footer-left-txt');
    if (footerTxt) footerTxt.textContent = useBrandData.footerLeft;
    
    // Render dynamic ticker
    this.renderTicker(useBrandData.ticker);
    
    // Make sure correct filter chip is active in UI
    const filterRow = document.querySelector('.filter-row');
    if (filterRow) {
      filterRow.querySelectorAll('.filter-chip').forEach(chip => {
        if (chip.textContent.trim() === filter) {
          chip.classList.add('active');
        } else {
          chip.classList.remove('active');
        }
      });
    }
    
    // Render tab views
    this.renderOverviewTab(useBrandData);
    this.renderGrowthTab(useBrandData);
    this.renderProductTab(useBrandData);
    
    // Transition Portal -> Dashboard
    const portal = document.getElementById('portal-view');
    const dashboard = document.getElementById('dashboard-view');
    
    portal.style.opacity = '0';
    setTimeout(() => {
      portal.style.display = 'none';
      dashboard.style.display = 'block';
      setTimeout(() => {
        dashboard.style.opacity = '1';
        this.switchTab('overview');
      }, 50);
    }, 400);
    
    this.showToast(`LAUNCHED ${brandData.title.toUpperCase()} CI PLATFORM`);
  }
  
  showPortal() {
    const portal = document.getElementById('portal-view');
    const dashboard = document.getElementById('dashboard-view');
    
    dashboard.style.opacity = '0';
    setTimeout(() => {
      dashboard.style.display = 'none';
      portal.style.display = 'flex';
      setTimeout(() => {
        portal.style.opacity = '1';
      }, 50);
    }, 400);
  }
  
  renderTicker(tickerItems) {
    const track = document.getElementById('ticker');
    if (!track || !tickerItems) return;
    track.innerHTML = '';
    
    // Duplicate the ticker items to create seamless scrolling loop
    const itemsToRender = [...tickerItems, ...tickerItems];
    itemsToRender.forEach(item => {
      const el = document.createElement('span');
      el.className = 'ticker-item';
      el.innerHTML = `<span class="t-dot"></span><span class="t-co">${item.tag}</span>${item.text}`;
      track.appendChild(el);
    });
  }
  
  renderStats(statsArray, containerId) {
    const container = document.getElementById(containerId);
    if (!container || !statsArray) return;
    
    container.innerHTML = statsArray.map(stat => {
      const changeHtml = stat.change ? `<span>${stat.change}</span>` : '';
      const styleVal = (stat.value && stat.value.length > 12) ? 'style="font-size:15px;padding-top:3px;"' : '';
      return `
        <div class="stat-cell">
          <div class="stat-label">${stat.label}</div>
          <div class="stat-value" ${styleVal}>${stat.value} ${changeHtml}</div>
          <div class="stat-sub">${stat.sub}</div>
        </div>
      `;
    }).join('');
  }
  
  renderColumn(colData, isOverview) {
    const maxItems = isOverview ? 24 : 48;
    const initialCards = colData.cards.slice(0, 3);
    const remainingCards = colData.cards.slice(3, maxItems);
    const hasMore = colData.cards.length > 3;
    
    const colId = `col-${colData.title.toLowerCase().replace(/[\s\W]+/g, '-')}`;
    this.columnCards[colId] = colData.cards;
    
    const bannerHtml = colData.banner ? `
      <div class="insight-banner">
        <div class="insight-icon">💡</div>
        <div class="insight-text">${colData.banner}</div>
      </div>
    ` : '';
    
    let sliderHtml = '';
    if (hasMore && remainingCards.length > 0) {
      sliderHtml = `
        <div class="scroll-more">
          <button class="slider-drawer-btn" onclick="window.app.uiManager.openColumnModal('${colId}', ${isOverview})">
            View ${remainingCards.length} More Alerts →
          </button>
        </div>
      `;
    }
    
    return `
      <div class="grid-col-inner">
        <div class="grid-col-heading">
          <div class="grid-col-heading-left">
            <div class="col-icon">${colData.icon}</div>
            <div>
              <div class="col-title">${colData.title}</div>
              <div class="col-subtitle">${colData.subtitle}</div>
            </div>
          </div>
          <div class="col-count-badge">${colData.count}</div>
        </div>
        <div class="grid-col-body">
          ${bannerHtml}
          <div id="${colId}-cards">
            ${this.renderCardsList(initialCards)}
          </div>
          ${sliderHtml}
        </div>
      </div>
    `;
  }
  
  showAllColumnCards(colId) {
    const cards = this.columnCards[colId];
    if (!cards) return;
    
    const cardsContainer = document.getElementById(`${colId}-cards`);
    if (cardsContainer) {
      cardsContainer.innerHTML = this.renderCardsList(cards);
    }
    
    const moreBtn = document.getElementById(`${colId}-more`);
    if (moreBtn) {
      moreBtn.style.display = 'none';
    }
    
    this.showToast(`SHOWING ALL ${cards.length} ITEMS`);
  }
  
  renderCardsList(cardsArray) {
    if (!cardsArray || cardsArray.length === 0) {
      return `
        <div style="font-family:var(--mono); font-size:11px; color:var(--muted); text-align:center; padding:32px 16px;">
          No articles in this section
        </div>
      `;
    }
    return cardsArray.map(card => {
      const tagsHtml = card.tags.map(t => `<span class="tag ${this.tagClassMap[t] || 'tag-slate'}">${t}</span>`).join('');
      const logoSVG = getLogoSVG(card.company);
      return `
        <div class="flat-card" onclick="window.app.uiManager.openDrawer(${card.id})">
          <div class="flat-card-meta">
            <div class="flat-card-company">
              <div class="company-logo">${logoSVG}</div>
              <span class="company-name">${card.company}</span>
            </div>
            <span class="news-time">${card.time}</span>
          </div>
          <div class="flat-card-headline">${card.title}</div>
          <div class="flat-card-footer">
            <div class="news-tags">${tagsHtml}</div>
            <span class="news-source">${card.source}</span>
          </div>
        </div>
      `;
    }).join('');
  }
  
  renderOverviewTab(brandData) {
    const grid = document.getElementById('overview-grid');
    if (grid && brandData.overviewCols) {
      grid.innerHTML = brandData.overviewCols.map(col => this.renderColumn(col, true)).join('');
    }
    
    // Stats strip
    this.renderStats(brandData.stats.overview, 'overview-stats');
    
    // Executive insights lists
    const insightsList = document.getElementById('overview-insights-list');
    if (insightsList && brandData.insights && brandData.insights.overview) {
      insightsList.innerHTML = brandData.insights.overview.map(ins => `<li>${ins}</li>`).join('');
    }
    
    // Render dynamic video briefs
    this.renderSocialSignals();
  }
  
  renderGrowthTab(brandData) {
    const grid = document.getElementById('growth-grid');
    if (grid && brandData.growthCols) {
      grid.innerHTML = brandData.growthCols.map(col => this.renderColumn(col, false)).join('');
    }
    this.renderStats(brandData.stats['growth-marketing'], 'growth-stats');
    
    const insightsList = document.getElementById('growth-insights-list');
    if (insightsList && brandData.insights && brandData.insights['growth-marketing']) {
      insightsList.innerHTML = brandData.insights['growth-marketing'].map(ins => `<li>${ins}</li>`).join('');
    }
  }
  
  renderProductTab(brandData) {
    const grid = document.getElementById('product-grid');
    if (grid && brandData.productCols) {
      grid.innerHTML = brandData.productCols.map(col => this.renderColumn(col, false)).join('');
    }
    this.renderStats(brandData.stats['product-strategy'], 'product-stats');
    
    const insightsList = document.getElementById('product-insights-list');
    if (insightsList && brandData.insights && brandData.insights['product-strategy']) {
      insightsList.innerHTML = brandData.insights['product-strategy'].map(ins => `<li>${ins}</li>`).join('');
    }
  }
  
  switchTab(tabId) {
    this.activeTab = tabId;
    
    // Toggle active tab header state
    document.querySelectorAll('.nav-tab').forEach(tab => {
      if (tab.getAttribute('data-tab') === tabId) {
        tab.classList.add('active');
      } else {
        tab.classList.remove('active');
      }
    });
    
    // Toggle tab panels visibility
    document.querySelectorAll('.tab-view').forEach(panel => {
      if (panel.id === `view-${tabId}`) {
        panel.style.display = 'block';
      } else {
        panel.style.display = 'none';
      }
    });
    
    // Draw current tab stats strip
    if (this.brandData) {
      if (tabId === 'overview') this.renderStats(this.brandData.stats.overview, 'overview-stats');
      if (tabId === 'growth-marketing') this.renderStats(this.brandData.stats['growth-marketing'], 'growth-stats');
      if (tabId === 'product-strategy') this.renderStats(this.brandData.stats['product-strategy'], 'product-stats');
    }
  }
  
  openDrawer(articleId) {
    // Find the article matching this ID across all columns
    const allCols = [
      ...this.brandData.overviewCols,
      ...this.brandData.growthCols,
      ...this.brandData.productCols
    ];
    let card = null;
    for (const col of allCols) {
      card = col.cards.find(c => c.id === articleId);
      if (card) break;
    }
    
    if (!card) return;
    
    // Populate details panel
    const drawerLogo = document.getElementById('drawer-logo');
    if (drawerLogo) drawerLogo.innerHTML = getLogoSVG(card.company);
    
    const drawerComp = document.getElementById('drawer-company');
    if (drawerComp) drawerComp.textContent = card.company;
    
    const drawerTime = document.getElementById('drawer-time');
    if (drawerTime) drawerTime.textContent = `Published: ${card.time} | Source: ${card.source}`;
    
    const drawerHeadline = document.getElementById('drawer-headline');
    if (drawerHeadline) drawerHeadline.textContent = card.title;
    
    const drawerBody = document.getElementById('drawer-body');
    if (drawerBody) {
      // Decode fallback summary format or raw text
      let bodyText = card.body;
      if (bodyText.startsWith("[Summary Fallback]")) {
        bodyText = bodyText.replace("[Summary Fallback]", "").trim();
      }
      drawerBody.textContent = bodyText || "No text body available.";
    }
    
    const drawerTags = document.getElementById('drawer-tags');
    if (drawerTags) {
      drawerTags.innerHTML = '';
      card.tags.forEach(t => {
        const span = document.createElement('span');
        span.className = `tag ${this.tagClassMap[t] || 'tag-slate'}`;
        span.textContent = t;
        drawerTags.appendChild(span);
      });
    }
    
    const drawerLink = document.getElementById('drawer-link');
    if (drawerLink) {
      drawerLink.href = card.url;
      drawerLink.style.display = card.url === '#' ? 'none' : 'inline-block';
    }
    
    // Animate display
    const overlay = document.getElementById('drawer-overlay');
    const drawer = document.getElementById('drawer');
    
    overlay.style.display = 'block';
    setTimeout(() => {
      overlay.style.opacity = '1';
      drawer.style.right = '0';
    }, 20);
  }
  
  closeDrawer() {
    const overlay = document.getElementById('drawer-overlay');
    const drawer = document.getElementById('drawer');
    
    drawer.style.right = '-420px';
    overlay.style.opacity = '0';
    setTimeout(() => {
      overlay.style.display = 'none';
    }, 300);
  }

  openColumnModal(colId, isOverview) {
    const cards = this.columnCards[colId];
    if (!cards) return;
    
    const maxItems = isOverview ? 24 : 48;
    const remainingCards = cards.slice(3, maxItems);
    
    const titleEl = document.getElementById('column-modal-title');
    if (titleEl) {
      const allCols = [
        ...(this.brandData.overviewCols || []),
        ...(this.brandData.growthCols || []),
        ...(this.brandData.productCols || [])
      ];
      const match = allCols.find(c => `col-${c.title.toLowerCase().replace(/[\s\W]+/g, '-')}` === colId);
      titleEl.textContent = match ? `MORE ${match.title.toUpperCase()}` : "MORE ALERTS";
    }
    
    const cardsContainer = document.getElementById('column-modal-cards');
    if (cardsContainer) {
      cardsContainer.innerHTML = this.renderCardsList(remainingCards);
    }
    
    const overlay = document.getElementById('column-modal-overlay');
    const modal = document.getElementById('column-modal');
    
    overlay.style.display = 'block';
    modal.style.display = 'flex';
    setTimeout(() => {
      overlay.style.opacity = '1';
      modal.style.opacity = '1';
      modal.style.transform = 'translate(-50%, -50%) scale(1)';
    }, 20);
  }
  
  closeColumnModal() {
    const overlay = document.getElementById('column-modal-overlay');
    const modal = document.getElementById('column-modal');
    
    modal.style.opacity = '0';
    modal.style.transform = 'translate(-50%, -45%) scale(0.95)';
    overlay.style.opacity = '0';
    setTimeout(() => {
      overlay.style.display = 'none';
      modal.style.display = 'none';
    }, 300);
  }

  openSocialModal() {
    const briefs = this.filteredSocialBriefs || [];
    const remainingBriefs = briefs.slice(3, 24);
    
    const cardsContainer = document.getElementById('social-modal-cards');
    if (cardsContainer) {
      cardsContainer.innerHTML = remainingBriefs.map((v, i) => {
        const logoSVG = getLogoSVG(v.company);
        return `
          <div class="flat-card" onclick="window.app.uiManager.closeSocialModal(); window.app.uiManager.openVideo(${v.originalIndex})">
            <div class="flat-card-meta">
              <div class="flat-card-company">
                <div class="company-logo">${logoSVG}</div>
                <span class="company-name">${v.company}</span>
              </div>
              <span class="news-time">${v.date}</span>
            </div>
            <div class="flat-card-headline" style="font-size:12px; font-weight:600; color:var(--white);">${v.title}</div>
            <div class="flat-card-footer">
              <div class="news-tags">
                <span class="tag tag-orange">${v.badge}</span>
                <span class="tag tag-slate">${v.category.toUpperCase()}</span>
              </div>
              <span class="news-source">${v.source}</span>
            </div>
          </div>
        `;
      }).join('');
    }
    
    const overlay = document.getElementById('social-modal-overlay');
    const modal = document.getElementById('social-modal');
    
    overlay.style.display = 'block';
    modal.style.display = 'flex';
    setTimeout(() => {
      overlay.style.opacity = '1';
      modal.style.opacity = '1';
      modal.style.transform = 'translate(-50%, -50%) scale(1)';
    }, 20);
  }
  
  closeSocialModal() {
    const overlay = document.getElementById('social-modal-overlay');
    const modal = document.getElementById('social-modal');
    
    modal.style.opacity = '0';
    modal.style.transform = 'translate(-50%, -45%) scale(0.95)';
    overlay.style.opacity = '0';
    setTimeout(() => {
      overlay.style.display = 'none';
      modal.style.display = 'none';
    }, 300);
  }

  renderSocialSignals() {
    const videoSection = document.getElementById('video-section-title');
    if (videoSection && this.brandData) {
      videoSection.textContent = `${this.brandData.title} Social Signals`;
    }
    
    const videoGrid = document.getElementById('video-grid-container');
    const viewMoreContainer = document.getElementById('view-more-posts-container');
    if (!videoGrid || !this.brandData) return;
    
    videoGrid.innerHTML = '';
    
    const allBriefs = this.app.dataManager.brandVideoData[this.activeBrand] || [];
    
    // Find unique platforms in available posts for this brand
    const availablePlatforms = new Set();
    allBriefs.forEach(b => {
      if (b.source) {
        availablePlatforms.add(b.source.toLowerCase());
      }
    });

    // Reset filter to 'ALL' if the active filter platform is not present in this brand's posts
    if (this.activeSocialPlatformFilter !== 'ALL') {
      const activeKey = this.activeSocialPlatformFilter.toLowerCase();
      if (!availablePlatforms.has(activeKey)) {
        this.activeSocialPlatformFilter = 'ALL';
      }
    }

    // Rebuild platform filters dynamically in the UI
    const filterRow = document.querySelector('.social-filter-row');
    if (filterRow) {
      const platformOptions = [
        { key: 'all', label: 'ALL', id: 'social-filter-ALL' },
        { key: 'x (twitter)', label: '𝕏 (TWITTER)', id: 'social-filter-X' },
        { key: 'linkedin', label: '💼 LINKEDIN', id: 'social-filter-LINKEDIN' },
        { key: 'instagram', label: '📸 INSTAGRAM', id: 'social-filter-INSTAGRAM' },
        { key: 'youtube', label: '🎥 YOUTUBE', id: 'social-filter-YOUTUBE' }
      ];
      
      let html = '';
      platformOptions.forEach(opt => {
        if (opt.key === 'all' || availablePlatforms.has(opt.key)) {
          const isActive = (opt.key === 'all' && this.activeSocialPlatformFilter === 'ALL') || 
                           (this.activeSocialPlatformFilter.toLowerCase() === opt.key);
          const activeClass = isActive ? 'active' : '';
          
          let filterValue = 'ALL';
          if (opt.key === 'x (twitter)') filterValue = 'X (Twitter)';
          else if (opt.key === 'linkedin') filterValue = 'LinkedIn';
          else if (opt.key === 'instagram') filterValue = 'Instagram';
          else if (opt.key === 'youtube') filterValue = 'YouTube';
          
          html += `<div class="filter-chip ${activeClass}" id="${opt.id}" onclick="window.app.uiManager.setSocialPlatformFilter('${filterValue}')">${opt.label}</div>`;
        }
      });
      filterRow.innerHTML = html;
    }

    // Map with original indices for safe routing in openVideo
    const mappedBriefs = allBriefs.map((b, originalIndex) => ({ ...b, originalIndex }));
    
    // Filter
    let filteredBriefs = mappedBriefs;
    if (this.activeSocialPlatformFilter !== 'ALL') {
      filteredBriefs = mappedBriefs.filter(b => b.source.toLowerCase().includes(this.activeSocialPlatformFilter.toLowerCase()) || (this.activeSocialPlatformFilter.toLowerCase() === 'x (twitter)' && b.source.toLowerCase() === 'x (twitter)'));
    }
    
    this.filteredSocialBriefs = filteredBriefs;
    
    const mainBriefs = filteredBriefs.slice(0, 3);
    
    if (mainBriefs.length === 0) {
      videoGrid.innerHTML = `
        <div style="grid-column: span 3; font-family: var(--mono); font-size: 11px; color: var(--muted); text-align: center; padding: 40px 16px;">
          No social signals matching this platform filter
        </div>
      `;
    } else {
      mainBriefs.forEach(v => {
        const card = document.createElement('div');
        card.className = 'flat-card';
        card.style.cssText = 'cursor:pointer; display: flex; flex-direction: column; gap: 8px; justify-content: space-between; min-height: 180px;';
        card.setAttribute('onclick', `window.app.uiManager.openVideo(${v.originalIndex})`);
        
        const logoSVG = getLogoSVG(v.company);
        
        card.innerHTML = `
          <div class="flat-card-meta">
            <div class="flat-card-company">
              <div class="company-logo" style="width:18px;height:18px;">${logoSVG}</div>
              <span class="company-name">${v.company}</span>
            </div>
            <span class="news-time">${v.date}</span>
          </div>
          <div class="flat-card-headline" style="font-weight:600; font-size:12px; line-height:1.4; color:var(--white);">${v.title}</div>
          <div style="font-size:11px; color:var(--slate); line-height:1.45; flex-grow:1;">
            <strong>Snippet:</strong> ${v.body.length > 120 ? v.body.slice(0, 120) + '...' : v.body}
          </div>
          <div class="flat-card-footer" style="margin-top:auto; padding-top:4px; border-top:1px solid rgba(0,0,0,0.05);">
            <div class="news-tags">
              <span class="tag tag-orange">${v.badge}</span>
              <span class="tag tag-slate">${v.category.toUpperCase()}</span>
            </div>
            <span style="font-family:var(--mono); font-size:10px; color:var(--orange); font-weight:600;">VIEW BRIEF →</span>
          </div>
        `;
        videoGrid.appendChild(card);
      });
    }

    if (viewMoreContainer) {
      if (filteredBriefs.length > 3) {
        viewMoreContainer.style.display = 'block';
        const btn = document.getElementById('view-more-posts-btn');
        if (btn) {
          btn.textContent = `View ${filteredBriefs.length - 3} More Posts →`;
        }
      } else {
        viewMoreContainer.style.display = 'none';
      }
    }
  }

  setSocialPlatformFilter(platform) {
    this.activeSocialPlatformFilter = platform;
    
    const row = document.querySelector('.social-filter-row');
    if (row) {
      row.querySelectorAll('.filter-chip').forEach(chip => {
        const chipText = chip.textContent.trim().toUpperCase();
        const activeText = platform.toUpperCase();
        
        if (activeText === 'ALL' && chipText === 'ALL') {
          chip.classList.add('active');
        } else if (activeText.includes('TWITTER') && chipText.includes('TWITTER')) {
          chip.classList.add('active');
        } else if (activeText.includes('LINKEDIN') && chipText.includes('LINKEDIN')) {
          chip.classList.add('active');
        } else if (activeText.includes('INSTAGRAM') && chipText.includes('INSTAGRAM')) {
          chip.classList.add('active');
        } else if (activeText.includes('YOUTUBE') && chipText.includes('YOUTUBE')) {
          chip.classList.add('active');
        } else {
          chip.classList.remove('active');
        }
      });
    }
    
    this.renderSocialSignals();
    this.showToast(`FILTERED SOCIAL SIGNALS: ${platform.toUpperCase()}`);
  }
  
  openVideo(idx) {
    const briefs = this.app.dataManager.brandVideoData[this.activeBrand] || [];
    const v = briefs[idx];
    if (!v) return;
    
    const compLogoEl = document.getElementById('video-modal-company-logo');
    if (compLogoEl) compLogoEl.innerHTML = getLogoSVG(v.company);
    
    const platformLogoEl = document.getElementById('video-modal-platform-logo');
    if (platformLogoEl) platformLogoEl.innerHTML = getLogoSVG(v.source);
    
    const modalBadge = document.getElementById('video-modal-badge');
    if (modalBadge) {
      let badgeColor = '#ff6b00';
      let badgeBg = 'rgba(255, 107, 0, 0.12)';
      if (v.badge.includes('HIGH')) {
        badgeColor = '#ff3b30';
        badgeBg = 'rgba(255, 59, 48, 0.12)';
      } else if (v.badge.includes('LOW')) {
        badgeColor = '#34c759';
        badgeBg = 'rgba(52, 199, 89, 0.12)';
      }
      modalBadge.textContent = v.badge;
      modalBadge.className = '';
      modalBadge.style.cssText = `font-family:var(--mono);font-size:9.5px;font-weight:700;letter-spacing:.08em;padding:4px 10px;border-radius:4px;display:inline-block;color:${badgeColor};background:${badgeBg};border:1px solid ${badgeColor}33;`;
    }
    
    const modalTitle = document.getElementById('video-modal-title');
    if (modalTitle) modalTitle.textContent = v.title;
    
    const modalMeta = document.getElementById('video-modal-meta');
    if (modalMeta) {
      modalMeta.innerHTML = `<span style="color:var(--text-dim);">COMPANY:</span> <strong style="color:var(--white);">${v.company}</strong> &nbsp;·&nbsp; <span style="color:var(--text-dim);">CATEGORY:</span> <strong style="color:var(--white);">${v.category}</strong> &nbsp;·&nbsp; <span style="color:var(--text-dim);">SOURCE:</span> <strong style="color:var(--white);">${v.source}</strong>`;
    }
    
    const modalBrief = document.getElementById('video-modal-brief-body');
    if (modalBrief) modalBrief.textContent = v.body;
    
    const modalLink = document.getElementById('video-modal-link');
    if (modalLink) {
      modalLink.href = v.url;
      modalLink.style.display = v.url === '#' ? 'none' : 'inline-block';
      
      let btnColor = 'var(--orange)';
      if (v.source.toLowerCase().includes('linkedin')) btnColor = '#0077B5';
      else if (v.source.toLowerCase().includes('youtube')) btnColor = '#FF0000';
      else if (v.source.toLowerCase().includes('instagram')) btnColor = '#E1306C';
      else if (v.source.toLowerCase().includes('x (twitter)') || v.source.toLowerCase() === 'x') btnColor = '#111111';
      modalLink.style.backgroundColor = btnColor;
    }
    
    const overlay = document.getElementById('video-overlay');
    const modal = document.getElementById('video-modal');
    
    overlay.style.display = 'block';
    modal.style.display = 'block';
    setTimeout(() => {
      overlay.style.opacity = '1';
      modal.style.opacity = '1';
      modal.style.transform = 'translate(-50%, -50%)';
    }, 20);
  }
  
  closeVideo() {
    const overlay = document.getElementById('video-overlay');
    const modal = document.getElementById('video-modal');
    
    modal.style.opacity = '0';
    modal.style.transform = 'translate(-50%, -45%)';
    overlay.style.opacity = '0';
    setTimeout(() => {
      overlay.style.display = 'none';
      modal.style.display = 'none';
    }, 300);
  }
  
  openAdd() {
    const overlay = document.getElementById('add-overlay');
    const modal = document.getElementById('add-modal');
    
    overlay.style.display = 'block';
    modal.style.display = 'block';
    setTimeout(() => {
      overlay.style.opacity = '1';
      modal.style.opacity = '1';
      modal.style.transform = 'translate(-50%, -50%)';
    }, 20);
  }
  
  closeAdd() {
    const overlay = document.getElementById('add-overlay');
    const modal = document.getElementById('add-modal');
    
    modal.style.opacity = '0';
    modal.style.transform = 'translate(-50%, -45%)';
    overlay.style.opacity = '0';
    setTimeout(() => {
      overlay.style.display = 'none';
      modal.style.display = 'none';
      // clear fields
      document.getElementById('add-name').value = '';
      document.getElementById('add-url').value = '';
    }, 300);
  }
  
  submitAdd() {
    const name = document.getElementById('add-name').value.trim();
    if (!name) return;
    this.closeAdd();
    this.showToast(`${name.toUpperCase()} ADDED TO ${this.activeBrand.toUpperCase()} WATCHLIST`);
  }
  
  showToast(msg) {
    let t = document.getElementById('micc-toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'micc-toast';
      t.className = 'toast-notification';
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.style.opacity = '1';
    t.style.transform = 'translateX(-50%) translateY(0)';
    clearTimeout(t._timer);
    t._timer = setTimeout(() => {
      t.style.opacity = '0';
      t.style.transform = 'translateX(-50%) translateY(10px)';
    }, 2200);
  }
  
  initClock() {
    const clockEl = document.getElementById('clock');
    if (!clockEl) return;
    
    const updateTime = () => {
      const now = new Date();
      const options = { 
        weekday: 'short', 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit',
        hour12: false 
      };
      clockEl.textContent = now.toLocaleDateString('en-US', options).toUpperCase();
    };
    
    updateTime();
    setInterval(updateTime, 1000);
  }
  
  setFilter(filterType) {
    this.activeFilter = filterType;
    
    // Update active filter chip classes
    const filterRow = document.querySelector('.filter-row');
    if (filterRow) {
      filterRow.querySelectorAll('.filter-chip').forEach(chip => {
        if (chip.textContent.trim() === filterType) {
          chip.classList.add('active');
        } else {
          chip.classList.remove('active');
        }
      });
    }
    
    if (this.activeBrand) {
      const brandData = this.app.dataManager.filterBrandData(this.activeBrand, filterType);
      this.brandData = brandData;
      
      this.renderOverviewTab(brandData);
      this.renderGrowthTab(brandData);
      this.renderProductTab(brandData);
      
      const filterLabelMap = {
        'ALL': 'ALL HISTORICAL ALERTS',
        'TODAY': 'TODAY\'S RE-SCORED NEWS',
        '7D': '7-DAY TRENDS & DECAYED ALERTS',
        '30D': '30-DAY COMPETITIVE SIGNALS'
      };
      this.showToast(`FILTERED BY: ${filterLabelMap[filterType] || filterType}`);
    }
  }

  bindGlobalEvents() {
    // Esc key support to close open items
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeDrawer();
        this.closeColumnModal();
        this.closeVideo();
        this.closeAdd();
        this.closeSocialModal();
      }
    });
  }
}
