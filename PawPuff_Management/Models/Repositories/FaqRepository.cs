using Microsoft.EntityFrameworkCore;
using PawPuff_Management.Models.DTOs;
using PawPuff_Management.Models.EfModels;

namespace PawPuff_Management.Models.Repositories
{
    /// <summary>
    /// 使用專案既有的 PawPuffContext 與 Faq 實體,不新增也不修改任何 EF 產生的檔案。
    /// </summary>
    public class FaqRepository : IFaqRepository
    {
        private readonly PawPuffContext _context;

        public FaqRepository(PawPuffContext context)
        {
            _context = context;
        }

        public async Task<List<Faq>> GetListAsync(FaqQueryDto query)
        {
            IQueryable<Faq> source = _context.Faqs.AsNoTracking();

            if (query.Type.HasValue)
            {
                source = source.Where(x => x.Type == query.Type.Value);
            }

            if (!query.IncludeInactive)
            {
                source = source.Where(x => x.IsActive);
            }

            if (!string.IsNullOrWhiteSpace(query.QuestionKeyword))
            {
                string keyword = query.QuestionKeyword.Trim();
                source = source.Where(x => x.Question.Contains(keyword));
            }

            if (!string.IsNullOrWhiteSpace(query.AnswerKeyword))
            {
                string keyword = query.AnswerKeyword.Trim();
                source = source.Where(x => x.Answer.Contains(keyword));
            }

            // sort_order 是全站流水排序,編號時已經讓類別依下拉選單順序排好,
            // 所以這裡不需要再 OrderBy(type)。
            return await source
                .OrderBy(x => x.SortOrder)
                .ThenBy(x => x.Id)
                .ToListAsync();
        }

        public async Task<Faq?> GetByIdAsync(int id)
        {
            return await _context.Faqs.FirstOrDefaultAsync(x => x.Id == id);
        }

        public async Task<bool> QuestionExistsAsync(string question, int? excludeId = null)
        {
            IQueryable<Faq> source = _context.Faqs.AsNoTracking()
                .Where(x => x.Question == question);

            if (excludeId.HasValue)
            {
                source = source.Where(x => x.Id != excludeId.Value);
            }

            return await source.AnyAsync();
        }

        public async Task<int> GetMaxSortOrderAsync()
        {
            // 沒有資料時 MaxAsync 會噴例外,用 int? 投影就會安全回傳 null
            int? max = await _context.Faqs.AsNoTracking()
                .Select(x => (int?)x.SortOrder)
                .MaxAsync();

            return max ?? 0;
        }

        public async Task ShiftSortOrderAsync(int fromOrder)
        {
            await _context.Faqs
                .Where(x => x.SortOrder >= fromOrder)
                .ExecuteUpdateAsync(setter =>
                    setter.SetProperty(x => x.SortOrder, x => x.SortOrder + 1));
        }

        public async Task AddAsync(Faq entity)
        {
            bool desiredActive = entity.IsActive;

            _context.Faqs.Add(entity);
            await _context.SaveChangesAsync();

            // DbContext 對 is_active 設了 HasDefaultValue(true)。
            // EF Core 在 INSERT 時若看到屬性是 CLR 預設值(false),會跳過該欄位
            // 改用資料庫預設值,導致「新增時取消啟用」失效。
            // 這裡比對存檔後的實際值,不一致就補一次更新。
            // (不修改 DbContext 的前提下,這是最直接的解法。)
            if (entity.IsActive != desiredActive)
            {
                entity.IsActive = desiredActive;
                await _context.SaveChangesAsync();
            }
        }

        public async Task UpdateAsync(Faq entity)
        {
            _context.Faqs.Update(entity);
            await _context.SaveChangesAsync();
        }
    }
}
