using PawPuff_Management.Models.DTOs;

namespace PawPuff_Management.Models.ViewModels
{
    // Index 頁面需要的資料集中放在這裡。
    // Products 由 ShopService 從資料庫查詢後轉成 DTO。
    public class ShopIndexViewModel
    {
        // 目前操作的管理員帳號，會放到 data-actor-admin-account 給 JS 顯示或紀錄用。
        public string ActorAdminAccount { get; set; } = "admin01";

        // 商城商品列表，來源是 Product + DollBody/DollAccessory/DollColor/DollFrame。
        public IReadOnlyList<ShopProductDto> Products { get; set; } = Array.Empty<ShopProductDto>();
    }
}
