using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PawPuff_Management.Models;
using System.Diagnostics;

namespace PawPuff_Management.Controllers
{
	[Authorize]
	public class HomeController : Controller
    {
        private readonly ILogger<HomeController> _logger;

        public HomeController(ILogger<HomeController> logger)
        {
            _logger = logger;
        }



		///GET  /Admins/MyClockRecords
		///POST /Admins/ClockIn
		///POST /Admins/ClockOut
		///
		///
		///
		///上班打卡:
		///從 Cookie 取得 AdminId
		//→ 取得伺服器現在時間
		//→ 查詢今天是否已有紀錄
		//→ 沒有才新增 AdminsClock
		//→ 儲存資料庫
		///
		///
		///下班打卡:
		///從 Cookie 取得 AdminId
		//→ 查詢今天的 AdminsClock
		//→ 沒有上班紀錄就拒絕
		//→ 已打過下班卡就拒絕
		//→ 寫入 ClockOutTime
		//→ 儲存資料庫
		////

		public IActionResult Index()
        {
            return View();
        }

        public IActionResult Privacy()
        {
            return View();
        }

        [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
        public IActionResult Error()
        {
            return View(new ErrorViewModel { RequestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier });
        }
    }
}
