using Microsoft.AspNetCore.Mvc;
using PawPuff_Management.Models.DTOs;
using PawPuff_Management.Models.Services;

namespace PawPuff_Management.Controllers
{
    /// <summary>
    /// FAQ 後台維護,對應網址 /Faq。
    /// 篩選、排序、分頁由 faq-management.js 在前端處理,所以 Controller
    /// 只提供「整份清單」與三個 JSON 端點,不做伺服器端分頁。
    /// 目前不做登入驗證;之後要加,在類別上掛 [Authorize] 即可,其他層都不用動。
    /// </summary>
    public class FaqController : Controller
    {
        private readonly IFaqService _faqService;

        public FaqController(IFaqService faqService)
        {
            _faqService = faqService;
        }

        /// <summary>清單主頁,第一次載入直接把資料渲染進 tbody。</summary>
        [HttpGet]
        public async Task<IActionResult> Index()
        {
            // 後台要看得到停用的資料,所以 IncludeInactive 維持預設 true
            List<FaqListItemDto> list = await _faqService.GetListAsync(new FaqQueryDto());
            return View(list);
        }

        /// <summary>
        /// 存檔後前端用這支重抓整份清單。
        /// 排序位移是在 Service 層做的,前端自己算會不同步,所以一律回來重讀。
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> List()
        {
            List<FaqListItemDto> list = await _faqService.GetListAsync(new FaqQueryDto());
            return Json(list.Select(ToRow));
        }

        /// <summary>新增或儲存修改。Id = 0 為新增。</summary>
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Save(FaqFormDto dto)
        {
            if (!ModelState.IsValid)
            {
                Dictionary<string, string> errors = ModelState
                    .Where(x => x.Value?.Errors.Count > 0)
                    .ToDictionary(x => x.Key, x => x.Value!.Errors.First().ErrorMessage);

                return Json(new
                {
                    success = false,
                    message = "有欄位還沒填好,請確認後再儲存。",
                    fieldErrors = errors,
                    row = (object?)null
                });
            }

            FaqServiceResult<FaqListItemDto> result = await _faqService.SaveAsync(dto);
            return Json(ToJson(result));
        }

        /// <summary>切換啟用狀態;停用即為軟刪除,資料仍留在資料庫。</summary>
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> ToggleActive(int id, bool isActive)
        {
            FaqServiceResult<FaqListItemDto> result = await _faqService.ToggleActiveAsync(id, isActive);
            return Json(ToJson(result));
        }

        /// <summary>
        /// 一列資料的 JSON 形狀。欄位名稱刻意對齊畫面上的 data-* 屬性,
        /// 前端的 buildFaqRow() 拿到就能直接產生 tr。
        /// </summary>
        private static object ToRow(FaqListItemDto item)
        {
            return new
            {
                id = item.Id,
                type = item.TypeName,
                typeValue = item.Type,
                question = item.Question,
                answer = item.Answer,
                sortOrder = item.SortOrder,
                active = item.IsActive,
                createdAt = item.CreatedAtText,
                updatedAt = item.UpdatedAtText
            };
        }

        private static object ToJson(FaqServiceResult<FaqListItemDto> result)
        {
            return new
            {
                success = result.Success,
                message = result.Message,
                fieldErrors = result.FieldErrors,
                row = result.Data == null ? null : ToRow(result.Data)
            };
        }
    }
}
