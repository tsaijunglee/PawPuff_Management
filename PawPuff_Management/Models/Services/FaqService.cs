using PawPuff_Management.Models.DTOs;
using PawPuff_Management.Models.EfModels;
using PawPuff_Management.Models.Infra;
using PawPuff_Management.Models.Repositories;

namespace PawPuff_Management.Models.Services
{
    public class FaqService : IFaqService
    {
        private readonly IFaqRepository _repository;

        public FaqService(IFaqRepository repository)
        {
            _repository = repository;
        }

        public async Task<List<FaqListItemDto>> GetListAsync(FaqQueryDto query)
        {
            List<Faq> entities = await _repository.GetListAsync(query);
            return entities.Select(ToListItem).ToList();
        }

        public async Task<FaqServiceResult<FaqListItemDto>> SaveAsync(FaqFormDto dto)
        {
            string question = dto.Question.Trim();
            string answer = dto.Answer.Trim();

            // 問題內容唯一,編輯時要排除自己
            bool duplicated = await _repository.QuestionExistsAsync(
                question, dto.Id > 0 ? dto.Id : null);

            if (duplicated)
            {
                return FaqServiceResult<FaqListItemDto>.FieldFail(
                    nameof(FaqFormDto.Question),
                    "已經有相同的問題內容,請換一個寫法或直接編輯原本那一筆。");
            }

            // 時間統一在這裡裁到分,資料庫不會存到秒
            DateTime now = DateTime.Now.TruncateToMinute();

            if (dto.Id == 0)
            {
                int maxOrder = await _repository.GetMaxSortOrderAsync();
                int sortOrder;

                if (dto.SortOrder > 0 && dto.SortOrder <= maxOrder)
                {
                    // 指定插在中間:把該位置以後的資料整批往後推一號
                    await _repository.ShiftSortOrderAsync(dto.SortOrder);
                    sortOrder = dto.SortOrder;
                }
                else
                {
                    // 沒填或填超過範圍就接在最後
                    sortOrder = maxOrder + 1;
                }

                Faq created = new()
                {
                    Type = dto.Type,
                    Question = question,
                    Answer = answer,
                    SortOrder = sortOrder,
                    IsActive = dto.IsActive,
                    CreatedAt = now,
                    UpdatedAt = now
                };

                await _repository.AddAsync(created);
                return FaqServiceResult<FaqListItemDto>.OkWith(ToListItem(created), "已新增這則問答。");
            }

            Faq? target = await _repository.GetByIdAsync(dto.Id);
            if (target == null)
            {
                return FaqServiceResult<FaqListItemDto>.Fail("找不到這筆資料,可能已經被其他人刪除。");
            }

            target.Type = dto.Type;
            target.Question = question;
            target.Answer = answer;
            target.SortOrder = dto.SortOrder;
            target.IsActive = dto.IsActive;
            target.UpdatedAt = now;   // 建立時間不動

            await _repository.UpdateAsync(target);
            return FaqServiceResult<FaqListItemDto>.OkWith(ToListItem(target), "已儲存修改。");
        }

        public async Task<FaqServiceResult<FaqListItemDto>> ToggleActiveAsync(int id, bool isActive)
        {
            Faq? target = await _repository.GetByIdAsync(id);
            if (target == null)
            {
                return FaqServiceResult<FaqListItemDto>.Fail("找不到這筆資料。");
            }

            target.IsActive = isActive;
            target.UpdatedAt = DateTime.Now.TruncateToMinute();

            await _repository.UpdateAsync(target);

            return FaqServiceResult<FaqListItemDto>.OkWith(
                ToListItem(target),
                isActive ? "已啟用,前台會開始顯示這則問答。"
                         : "已停用,前台不會再顯示這則問答。");
        }

        /// <summary>Entity 轉 DTO。時間在這裡轉成字串,之後不可能有人不小心把秒印出來。</summary>
        private static FaqListItemDto ToListItem(Faq entity)
        {
            return new FaqListItemDto
            {
                Id = entity.Id,
                Type = entity.Type,
                TypeName = entity.Type.ToTypeName<FaqType>(),
                Question = entity.Question,
                Answer = entity.Answer,
                SortOrder = entity.SortOrder,
                IsActive = entity.IsActive,
                CreatedAtText = entity.CreatedAt.ToMinuteText(),
                UpdatedAtText = entity.UpdatedAt.ToMinuteText()
            };
        }
    }
}
