using PawPuff_Management.Models.EfModels;

namespace PawPuff_Management.Models.Dtos;

/// <summary>
/// Entity ↔ DTO 的手動對應。集中在同一處,日後欄位有變動只改這裡,
/// 不會散落在各個 Service。這是「方便維護」的關鍵。
/// </summary>
public static class ArticleCategoryMappings
{
	public static ArticleCategoryDto ToDto(this ArticleCategory entity) => new()
	{
		Id = entity.Id,
		Name = entity.Name,
		IsActive = entity.IsActive,
	};
}

