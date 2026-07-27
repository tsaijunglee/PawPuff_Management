using PawPuff_Management.Models.Dtos;
using PawPuff_Management.Models.EfModels;
using PawPuff_Management.Models.Repositories;

namespace PawPuff_Management.Models.Services;

public class ArticleCategoryService : IArticleCategoryService
{
    private readonly IArticleCategoryRepository _repository;

    public ArticleCategoryService(IArticleCategoryRepository repository)
    {
        _repository = repository;
    }

    public async Task<List<ArticleCategoryDto>> GetAllAsync(bool includeInactive = false)
    {
        var entities = await _repository.GetAllAsync(includeInactive);
        return entities.Select(e => e.ToDto()).ToList();
    }

    public async Task<ArticleCategoryDto?> GetByIdAsync(int id)
    {
        var entity = await _repository.GetByIdAsync(id);
        return entity?.ToDto();
    }

    public async Task<ServiceResult<int>> CreateAsync(ArticleCategoryCreateDto dto)
    {
        var name = (dto.Name ?? string.Empty).Trim();

        if (string.IsNullOrWhiteSpace(name))
            return ServiceResult<int>.Fail("分類名稱不可空白。");

        if (await _repository.NameExistsAsync(name, excludeId: null))
            return ServiceResult<int>.Fail("分類名稱已存在。");

        var entity = new ArticleCategory
        {
            Name = name,
            IsActive = dto.IsActive,
        };

        await _repository.AddAsync(entity);
        await _repository.SaveChangesAsync();

        return ServiceResult<int>.Ok(entity.Id);
    }

    public async Task<ServiceResult> UpdateAsync(ArticleCategoryEditDto dto)
    {
        var entity = await _repository.GetByIdAsync(dto.Id);
        if (entity is null)
            return ServiceResult.Fail("找不到指定的分類。");

        var name = (dto.Name ?? string.Empty).Trim();

        if (string.IsNullOrWhiteSpace(name))
            return ServiceResult.Fail("分類名稱不可空白。");

        // 排除自己,避免「沒改名稱」也被判定重複。
        if (await _repository.NameExistsAsync(name, excludeId: dto.Id))
            return ServiceResult.Fail("分類名稱已存在。");

        entity.Name = name;
        entity.IsActive = dto.IsActive;

        await _repository.SaveChangesAsync();
        return ServiceResult.Ok();
    }

    public async Task<ServiceResult> SetActiveAsync(int id, bool isActive)
    {
        var entity = await _repository.GetByIdAsync(id);
        if (entity is null)
            return ServiceResult.Fail("找不到指定的分類。");

        entity.IsActive = isActive;
        await _repository.SaveChangesAsync();
        return ServiceResult.Ok();
    }
}
