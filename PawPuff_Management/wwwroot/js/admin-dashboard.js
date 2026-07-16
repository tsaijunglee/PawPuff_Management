const sidebar = document.getElementById("sidebar");
    const sidebarToggle = document.getElementById("sidebarToggle");
    const sidebarBackdrop = document.getElementById("sidebarBackdrop");

    function setSidebar(open) {
      sidebar.classList.toggle("is-open", open);
      sidebarBackdrop.classList.toggle("is-visible", open);
      sidebarToggle?.setAttribute("aria-expanded", String(open));
    }

    sidebarToggle?.addEventListener("click", () => {
      setSidebar(!sidebar.classList.contains("is-open"));
    });

    sidebarBackdrop?.addEventListener("click", () => setSidebar(false));

    if (!window.bootstrap?.Collapse) {
      document.querySelectorAll(".nav-heading[data-bs-target]").forEach((button) => {
        button.addEventListener("click", () => {
          const target = document.querySelector(button.dataset.bsTarget);
          if (!target) return;

          const willOpen = !target.classList.contains("show");
          document.querySelectorAll("#sidebarAccordion .side-nav.collapse.show").forEach((menu) => {
            if (menu === target) return;
            menu.classList.remove("show");
            const controller = document.querySelector(`[data-bs-target="#${menu.id}"]`);
            controller?.classList.add("collapsed");
            controller?.setAttribute("aria-expanded", "false");
          });

          target.classList.toggle("show", willOpen);
          button.classList.toggle("collapsed", !willOpen);
          button.setAttribute("aria-expanded", String(willOpen));
        });
      });
    }

    const dashboardScreen = document.getElementById("dashboardScreen");
    const managementScreen = document.getElementById("managementScreen");
    const dashboardFooter = document.getElementById("dashboardFooter");
    const pageTitleWrap = document.getElementById("pageTitleWrap");
    const pageTitleText = document.getElementById("pageTitleText");
    const managementTitle = document.getElementById("managementTitle");
    const managementDescription = document.getElementById("managementDescription");
    const genericManagementActions = document.getElementById("genericManagementActions");
    const shopManagementActions = document.getElementById("shopManagementActions");
    const memberManagementView = document.getElementById("memberManagementView");
    const memberDetailView = document.getElementById("memberDetailView");
    const memberManagement = window.PawPuffMemberManagement;
    const defaultManagementTitle = managementTitle?.textContent.trim() || "";
    const defaultManagementDescription = managementDescription?.textContent.trim() || "";

    function syncSidebarParent(link) {
      const parentMenu = link.closest(".side-nav");

      document.querySelectorAll("#sidebarAccordion .side-nav.collapse.show").forEach((menu) => {
        if (menu === parentMenu) return;
        menu.classList.remove("show");
        const controller = document.querySelector(`[data-bs-target="#${menu.id}"]`);
        controller?.classList.add("collapsed");
        controller?.setAttribute("aria-expanded", "false");
      });

      if (!parentMenu) return;

      parentMenu.classList.add("show");
      const controller = document.querySelector(`[data-bs-target="#${parentMenu.id}"]`);
      controller?.classList.remove("collapsed");
      controller?.setAttribute("aria-expanded", "true");
    }

    function setActiveScreen(link) {
      const screen = link.dataset.screen;
      const title = link.dataset.screenTitle || defaultManagementTitle || link.textContent.trim();

      document.querySelectorAll("[data-screen]").forEach((item) => item.classList.remove("active"));
      link.classList.add("active");
      syncSidebarParent(link);
      pageTitleText.textContent = "管理平台";

      if (screen === "dashboard") {
        dashboardScreen?.classList.remove("d-none");
        dashboardFooter?.classList.remove("d-none");
        managementScreen?.classList.add("d-none");
        genericManagementActions?.classList.remove("d-none");
        shopManagementActions?.classList.add("d-none");
        memberManagementView?.classList.add("d-none");
        memberDetailView?.classList.add("d-none");
        pageTitleWrap?.classList.remove("d-none");
        return;
      }

      dashboardScreen?.classList.add("d-none");
      dashboardFooter?.classList.add("d-none");
      managementScreen?.classList.remove("d-none");
      if (managementTitle) managementTitle.textContent = title;
      if (managementDescription) {
        managementDescription.textContent = link.dataset.screenDescription || defaultManagementDescription;
      }

      const managedTableScreen = memberManagementView?.dataset.screen || "member-management";
      const isMemberManagement = screen === managedTableScreen;
      const isShopManagement = screen === "product-list";
      pageTitleWrap?.classList.remove("d-none");
      genericManagementActions?.classList.toggle("d-none", isMemberManagement || isShopManagement);
      shopManagementActions?.classList.toggle("d-none", !isShopManagement);
      memberManagementView?.classList.toggle("d-none", !isMemberManagement);
      memberDetailView?.classList.add("d-none");
      if (isMemberManagement) memberManagement?.renderTable();
    }

    const adminMenuToggle = document.getElementById("adminMenuToggle");
    const adminMenu = document.getElementById("adminMenu");
    const adminMenuWrap = adminMenuToggle?.closest(".dropdown");

    function setAdminMenu(open) {
      adminMenu?.classList.toggle("show", open);
      adminMenuToggle?.setAttribute("aria-expanded", String(open));
    }

    if (!window.bootstrap?.Dropdown) {
      adminMenuToggle?.addEventListener("click", (event) => {
        event.stopPropagation();
        setAdminMenu(!adminMenu.classList.contains("show"));
      });
    }

    document.querySelectorAll("[data-screen]").forEach((link) => {
      link.addEventListener("click", (event) => {
        const href = link.getAttribute("href") || "";
        if (!href.startsWith("#")) {
          setAdminMenu(false);
          if (window.innerWidth < 992) setSidebar(false);
          return;
        }

        event.preventDefault();
        setActiveScreen(link);
        history.replaceState(null, "", link.getAttribute("href"));
        setAdminMenu(false);
        if (window.innerWidth < 992) setSidebar(false);
      });
    });

    memberManagement?.init({
      dashboardScreen,
      managementScreen,
      dashboardFooter,
      pageTitleWrap,
      pageTitleText,
      managementTitle,
      managementDescription,
      genericManagementActions,
      shopManagementActions,
      memberManagementView,
      memberDetailView,
      syncSidebarParent,
      setActiveScreen
    });

    const detailHashAccount = memberManagement?.getDetailAccountFromHash(window.location.hash);
    const currentScreen = document.body.dataset.currentScreen;
    const currentScreenLink = currentScreen ? document.querySelector(`[data-screen="${currentScreen}"]`) : null;
    if (currentScreenLink) setActiveScreen(currentScreenLink);

    const hashScreenLink = window.location.hash && !detailHashAccount ? document.querySelector(`[href="${window.location.hash}"][data-screen]`) : null;
    if (hashScreenLink) setActiveScreen(hashScreenLink);
    if (detailHashAccount) memberManagement?.showDetail(detailHashAccount, false);

    const notificationToggle = document.getElementById("notificationToggle");
    const notificationPanel = document.getElementById("notificationPanel");
    const notificationBadge = document.getElementById("notificationBadge");
    const markAllRead = document.getElementById("markAllRead");
    const notificationWrap = document.querySelector(".notification-wrap");

    function updateNotificationBadge() {
      const unreadCount = document.querySelectorAll("[data-notification].is-unread").length;
      notificationBadge.textContent = unreadCount;
      notificationBadge.classList.toggle("is-empty", unreadCount === 0);
    }

    function setNotificationPanel(open) {
      notificationPanel.classList.toggle("d-none", !open);
      notificationToggle.setAttribute("aria-expanded", String(open));
    }

    function markNotificationRead(item) {
      item.classList.remove("is-unread");
      item.classList.add("is-read");
      item.setAttribute("aria-label", `${item.querySelector(".notification-name")?.textContent || "通知"}，已讀`);
      updateNotificationBadge();
    }

    notificationToggle?.addEventListener("click", (event) => {
      event.stopPropagation();
      setNotificationPanel(notificationPanel.classList.contains("d-none"));
    });

    markAllRead?.addEventListener("click", (event) => {
      event.stopPropagation();
      document.querySelectorAll("[data-notification]").forEach(markNotificationRead);
    });

    document.querySelectorAll("[data-notification]").forEach((item) => {
      item.addEventListener("click", () => {
        markNotificationRead(item);

        const targetScreen = item.dataset.screenTarget;
        const targetLink = document.querySelector(`[data-screen="${targetScreen}"]`);
        if (targetLink) {
          const href = targetLink.getAttribute("href");
          if (href && !href.startsWith("#")) {
            window.location.href = href;
          } else {
            setActiveScreen(targetLink);
            history.replaceState(null, "", href);
          }
        }

        setNotificationPanel(false);
      });
    });

    document.addEventListener("click", (event) => {
      if (!notificationWrap?.contains(event.target)) setNotificationPanel(false);
      if (!adminMenuWrap?.contains(event.target)) setAdminMenu(false);
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        setNotificationPanel(false);
        setAdminMenu(false);
      }
    });

    updateNotificationBadge();

    const formatter = new Intl.NumberFormat("zh-TW");
    document.querySelectorAll("[data-count]").forEach((counter) => {
      const target = Number(counter.dataset.count);
      const duration = 760;
      const start = performance.now();

      function tick(now) {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        counter.textContent = formatter.format(Math.round(target * eased));
        if (progress < 1) requestAnimationFrame(tick);
      }

      requestAnimationFrame(tick);
    });

    function prepareChart(canvas) {
      if (!canvas || typeof canvas.getContext !== "function") return null;

      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return null;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);

      const ctx = canvas.getContext("2d");
      if (!ctx) return null;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, rect.width, rect.height);
      ctx.font = '12px "Noto Sans TC", sans-serif';
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      return { ctx, width: rect.width, height: rect.height };
    }

    function drawRoundedRect(ctx, x, y, width, height, radius) {
      if (typeof ctx.roundRect === "function") {
        ctx.roundRect(x, y, width, height, radius);
        return;
      }

      const r = Math.min(radius, width / 2, height / 2);
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + width - r, y);
      ctx.quadraticCurveTo(x + width, y, x + width, y + r);
      ctx.lineTo(x + width, y + height - r);
      ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
      ctx.lineTo(x + r, y + height);
      ctx.quadraticCurveTo(x, y + height, x, y + height - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
    }

    function readChartJson(canvas, key, fallback = []) {
      if (!canvas?.dataset[key]) return fallback;

      try {
        return JSON.parse(canvas.dataset[key]);
      } catch {
        return fallback;
      }
    }

    function readChartMax(canvas, fallback) {
      const value = Number(canvas?.dataset.chartMax);
      return Number.isFinite(value) && value > 0 ? value : fallback;
    }

    function drawPieChart() {
      const canvas = document.getElementById("memberSourceChart");
      const chart = prepareChart(canvas);
      if (!chart) return;

      const { ctx, width, height } = chart;
      const data = readChartJson(canvas, "chartItems");
      if (!data.length) return;

      const total = data.reduce((sum, item) => sum + (Number(item.value) || 0), 0);
      if (!total) return;
      const cx = width / 2;
      const cy = height / 2 + 4;
      const radius = Math.min(width, height) * .34;
      let start = -Math.PI / 2;

      data.forEach((item) => {
        const slice = ((Number(item.value) || 0) / total) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, radius, start, start + slice);
        ctx.closePath();
        ctx.fillStyle = item.color;
        ctx.fill();
        ctx.strokeStyle = "#fffdf8";
        ctx.lineWidth = 3;
        ctx.stroke();
        start += slice;
      });

      ctx.beginPath();
      ctx.arc(cx, cy, radius * .56, 0, Math.PI * 2);
      ctx.fillStyle = "#fffdf8";
      ctx.fill();
      ctx.fillStyle = "#6c3e28";
      ctx.font = '900 16px "Noto Sans TC", sans-serif';
      ctx.textAlign = "center";
      ctx.fillText(canvas.dataset.chartCenterTitle || "", cx, cy - 4);
      ctx.font = '800 12px "Noto Sans TC", sans-serif';
      ctx.fillStyle = "#9b806a";
      ctx.fillText(canvas.dataset.chartCenterSubtitle || "", cx, cy + 17);
    }

    function drawLineChart() {
      const canvas = document.getElementById("weeklyTrafficChart");
      const chart = prepareChart(canvas);
      if (!chart) return;

      const { ctx, width, height } = chart;
      const labels = readChartJson(canvas, "chartLabels");
      const series = readChartJson(canvas, "chartSeries");
      if (!labels.length || !series.length) return;

      const margin = { top: 24, right: 18, bottom: 34, left: 46 };
      const plotW = width - margin.left - margin.right;
      const plotH = height - margin.top - margin.bottom;
      const values = series.flatMap((item) => item.values || []);
      const max = readChartMax(canvas, Math.max(...values, 1));

      ctx.strokeStyle = "#f0dfca";
      ctx.lineWidth = 1;
      ctx.fillStyle = "#9b806a";
      ctx.font = '800 11px "Noto Sans TC", sans-serif';
      ctx.textAlign = "right";

      for (let i = 0; i <= 4; i++) {
        const y = margin.top + (plotH / 4) * i;
        ctx.beginPath();
        ctx.moveTo(margin.left, y);
        ctx.lineTo(width - margin.right, y);
        ctx.stroke();
        ctx.fillText(String(Math.round(max - (max / 4) * i)), margin.left - 8, y + 4);
      }

      function point(value, index) {
        const numberValue = Number(value) || 0;
        return {
          x: margin.left + (plotW / Math.max(labels.length - 1, 1)) * index,
          y: margin.top + plotH - (numberValue / max) * plotH
        };
      }

      function drawLine(values, color) {
        ctx.beginPath();
        values.forEach((value, index) => {
          const p = point(value, index);
          if (index === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        });
        ctx.strokeStyle = color;
        ctx.lineWidth = 4;
        ctx.stroke();

        values.forEach((value, index) => {
          const p = point(value, index);
          ctx.beginPath();
          ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
          ctx.fillStyle = "#fffdf8";
          ctx.fill();
          ctx.strokeStyle = color;
          ctx.lineWidth = 3;
          ctx.stroke();
        });
      }

      series.forEach((item) => drawLine(item.values || [], item.color || "#d9914b"));

      ctx.textAlign = "center";
      ctx.fillStyle = "#8b654e";
      labels.forEach((label, index) => {
        const x = margin.left + (plotW / Math.max(labels.length - 1, 1)) * index;
        ctx.fillText(label, x, height - 10);
      });
    }

    function drawBarChart() {
      const canvas = document.getElementById("productSalesChart");
      const chart = prepareChart(canvas);
      if (!chart) return;

      const { ctx, width, height } = chart;
      const data = readChartJson(canvas, "chartItems");
      if (!data.length) return;

      const margin = { top: 20, right: 18, bottom: 38, left: 42 };
      const plotW = width - margin.left - margin.right;
      const plotH = height - margin.top - margin.bottom;
      const max = readChartMax(canvas, Math.max(...data.map((item) => Number(item.value) || 0), 1));
      const gap = 14;
      const barW = (plotW - gap * (data.length - 1)) / data.length;

      ctx.strokeStyle = "#f0dfca";
      ctx.lineWidth = 1;
      for (let i = 0; i <= 3; i++) {
        const y = margin.top + (plotH / 3) * i;
        ctx.beginPath();
        ctx.moveTo(margin.left, y);
        ctx.lineTo(width - margin.right, y);
        ctx.stroke();
      }

      data.forEach((item, index) => {
        const x = margin.left + (barW + gap) * index;
        const h = ((Number(item.value) || 0) / max) * plotH;
        const y = margin.top + plotH - h;

        ctx.fillStyle = "#fff0c8";
        ctx.beginPath();
        drawRoundedRect(ctx, x, margin.top, barW, plotH, 12);
        ctx.fill();

        ctx.fillStyle = "#f4bc55";
        ctx.beginPath();
        drawRoundedRect(ctx, x, y, barW, h, 12);
        ctx.fill();

        ctx.fillStyle = "#7a4a2c";
        ctx.font = '900 11px "Noto Sans TC", sans-serif';
        ctx.textAlign = "center";
        ctx.fillText(item.value, x + barW / 2, y - 8);
        ctx.fillStyle = "#8b654e";
        ctx.fillText(item.label, x + barW / 2, height - 12);
      });
    }

    function drawDashboardCharts() {
      drawPieChart();
      drawLineChart();
      drawBarChart();
    }

    drawDashboardCharts();
    let chartResizeTimer;
    window.addEventListener("resize", () => {
      clearTimeout(chartResizeTimer);
      chartResizeTimer = setTimeout(drawDashboardCharts, 120);
    });

    const toastElement = document.getElementById("actionToast");
    const toastMessage = document.getElementById("toastMessage");
    const toast = toastElement && window.bootstrap?.Toast ? new bootstrap.Toast(toastElement, { delay: 1800 }) : null;

    document.querySelectorAll("[data-action]").forEach((button) => {
      button.addEventListener("click", () => {
        toastMessage.textContent = `${button.dataset.action}已開啟`;
        toast?.show();
      });
    });
