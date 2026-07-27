using PawPuff_Management.Models.Dtos;

namespace PawPuff_Management.ViewModels.ArticleCategory;

/// <summary>
/// ViewModel ↔ DTO 的手動對應,集中於一處方便維護。
/// </summary>
public static class ArticleCategoryViewModelMappings
{
    public static ArticleCategoryCreateDto ToDto(this ArticleCategoryCreateVm vm) => new()
    {
        Name = vm.Name,
        IsActive = vm.IsActive,
    };

    public static ArticleCategoryEditDto ToDto(this ArticleCategoryEditVm vm) => new()
    {
        Id = vm.Id,
        Name = vm.Name,
        IsActive = vm.IsActive,
    };

    public static ArticleCategoryEditVm ToEditVm(this ArticleCategoryDto dto) => new()
    {
        Id = dto.Id,
        Name = dto.Name,
        IsActive = dto.IsActive,
    };

    public static ArticleCategoryIndexItemVm ToIndexItemVm(this ArticleCategoryDto dto) => new()
    {
        Id = dto.Id,
        Name = dto.Name,
        IsActive = dto.IsActive,
    };
}
