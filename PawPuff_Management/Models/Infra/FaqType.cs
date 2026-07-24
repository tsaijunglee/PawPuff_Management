using System.ComponentModel.DataAnnotations;

namespace PawPuff_Management.Models.Infra
{
    /// <summary>
    /// FAQ 問題類別。數值必須與資料表 faqs.type 一致。
    /// 之後要新增類別,只要在這裡加一行,下拉選單與清單顯示都會自動跟著。
    /// </summary>
    public enum FaqType
    {
        [Display(Name = "帳號")]
        Account = 1,

        [Display(Name = "文章")]
        Article = 2,

        [Display(Name = "商城")]
        Shop = 3,

        [Display(Name = "點數")]
        Point = 4,

        [Display(Name = "紙娃娃")]
        PaperDoll = 5,

        [Display(Name = "客服")]
        CustomerService = 6
    }
}
