using PawPuff_Management.Models.DTOs;

namespace PawPuff_Management.Models.Services
{
    /// <summary>
    /// 商業邏輯層。Controller 只跟這一層說話,不碰 Entity、不碰 DbContext。
    /// </summary>
    public interface IFaqService
    {
        /// <summary>取全部資料;篩選、排序、分頁由前端 JS 處理。</summary>
        Task<List<FaqListItemDto>> GetListAsync(FaqQueryDto query);

        /// <summary>新增或更新,依 dto.Id 判斷。成功時回傳存檔後的整列資料。</summary>
        Task<FaqServiceResult<FaqListItemDto>> SaveAsync(FaqFormDto dto);

        /// <summary>切換啟用狀態(停用等同軟刪除,資料仍保留)。</summary>
        Task<FaqServiceResult<FaqListItemDto>> ToggleActiveAsync(int id, bool isActive);
    }
}
