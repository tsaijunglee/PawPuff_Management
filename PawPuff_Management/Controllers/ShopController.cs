using Microsoft.AspNetCore.Mvc;
using PawPuff_Management.Models.DTOs;
using PawPuff_Management.Models.Services;

namespace PawPuff_Management.Controllers
{
    public class ShopController : Controller
    {
        //用途：
        //將 ShopController 從單純 return View() 改成：
        //1. Index 非同步讀取 DB 資料。
        //2. Create / UpdateStatus / UpdatePrice / UpdateSortOrder 提供 Ajax API。
        //3. Ajax 成功時回傳 JSON，讓前端局部更新，不重新整理整頁。

        private readonly IShopService _shopService;

        public ShopController(IShopService shopService)
        {
            _shopService = shopService;
        }

        // 一般頁面載入：讀取 Product 與 Doll* 資料後交給 View。
        public async Task<IActionResult> Index()
        {
            var model = await _shopService.GetIndexViewModelAsync(GetActorAdminAccount());
            return View(model);
        }

        // 非同步 Ajax 新增商品。
        // 因為新增會包含圖片上傳，所以使用 [FromForm] 接收 FormData。
        [HttpPost]
        [ValidateAntiForgeryToken]
        public Task<IActionResult> Create([FromForm] CreateShopProductDto dto) =>
            RunCommand(() => _shopService.CreateAsync(dto, GetActorAdminAccount()));

        // 非同步 Ajax 上下架。
        // 前端以 JSON 傳 productId、isActive、reason。
        [HttpPost]
        [ValidateAntiForgeryToken]
        public Task<IActionResult> UpdateStatus([FromBody] UpdateShopProductStatusDto dto) =>
            RunCommand(() => _shopService.UpdateStatusAsync(dto, GetActorAdminAccount()));

        // 非同步 Ajax 修改價格。
        [HttpPost]
        [ValidateAntiForgeryToken]
        public Task<IActionResult> UpdatePrice([FromBody] UpdateShopProductPriceDto dto) =>
            RunCommand(() => _shopService.UpdatePriceAsync(dto, GetActorAdminAccount()));

        // 非同步 Ajax 修改配件圖層排序。
        [HttpPost]
        [ValidateAntiForgeryToken]
        public Task<IActionResult> UpdateSortOrder([FromBody] UpdateShopAccessorySortDto dto) =>
            RunCommand(() => _shopService.UpdateAccessorySortAsync(dto, GetActorAdminAccount()));

        // 目前專案 Cookie 驗證似乎尚未完全啟用。
        // 這裡先以登入身分為優先，沒有登入時 fallback admin01。
        private string GetActorAdminAccount() =>
            User.Identity?.IsAuthenticated == true && !string.IsNullOrWhiteSpace(User.Identity.Name)
                ? User.Identity.Name!
                : "admin01";

        // 共用 Ajax 回應包裝。
        // 成功：{ success: true, product: ... }
        // 失敗：{ success: false, message: ... }
        private async Task<IActionResult> RunCommand(Func<Task<ShopProductDto>> command)
        {
            if (!ModelState.IsValid)
                return BadRequest(new { success = false, message = "資料格式不正確。" });

            try
            {
                return Json(new
                {
                    success = true,
                    product = await command()
                });
            }
            catch (Exception ex) when (ex is KeyNotFoundException or InvalidOperationException or ArgumentException)
            {
                return BadRequest(new
                {
                    success = false,
                    message = ex.Message
                });
            }
        }
    }

}
