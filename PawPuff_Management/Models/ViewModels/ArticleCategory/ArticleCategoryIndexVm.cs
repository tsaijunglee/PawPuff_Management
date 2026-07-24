namespace PawPuff_Management.ViewModels.ArticleCategory;
#nullable enable

/// <summary>
/// 分類管理單一 Index 頁的整合 ViewModel:清單 + 新增表單 + (選取時的)編輯表單。
/// </summary>
public class ArticleCategoryIndexVm
{
    public List<ArticleCategoryIndexItemVm> Items { get; set; } = new();
    public ArticleCategoryCreateVm CreateForm { get; set; } = new();

    // 有帶 ?editId= 且找得到時才有值,畫面就顯示編輯卡片。
    public ArticleCategoryEditVm? EditForm { get; set; }
}
