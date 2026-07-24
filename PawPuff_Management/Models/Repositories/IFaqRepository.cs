using PawPuff_Management.Models.DTOs;
using PawPuff_Management.Models.EfModels;

namespace PawPuff_Management.Models.Repositories
{
    /// <summary>
    /// 資料存取層。只負責跟資料庫溝通,不含任何商業規則。
    /// </summary>
    public interface IFaqRepository
    {
        Task<List<Faq>> GetListAsync(FaqQueryDto query);

        Task<Faq?> GetByIdAsync(int id);

        /// <summary>檢查問題內容是否重複。編輯時用 excludeId 排除自己。</summary>
        Task<bool> QuestionExistsAsync(string question, int? excludeId = null);

        /// <summary>取得全站目前最大的 sort_order,沒有資料時回傳 0。</summary>
        Task<int> GetMaxSortOrderAsync();

        /// <summary>把 sort_order 大於等於 fromOrder 的資料整批往後推一號,空出插入位置。</summary>
        Task ShiftSortOrderAsync(int fromOrder);

        Task AddAsync(Faq entity);

        Task UpdateAsync(Faq entity);
    }
}
