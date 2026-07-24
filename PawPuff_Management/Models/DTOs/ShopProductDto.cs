using Microsoft.AspNetCore.Http;
using System.ComponentModel.DataAnnotations;
using System.Globalization;

namespace PawPuff_Management.Models.DTOs
{
    // 給前端畫面使用的商品資料。
    // Service 會把 EF Entity(Product + Doll*) 轉成這個 DTO，避免 View 直接依賴資料庫模型細節。
    public class ShopProductDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = "";
        public string ProductType { get; set; } = "";

        // Product 與四種素材表的關聯 Id。
        public int? BodyId { get; set; }
        public int? AccessoryId { get; set; }
        public int? FramesId { get; set; }
        public int? ColorsId { get; set; }

        // 底圖、頭像框使用 ImageName / ImageSrc。
        // ImageName 是 DB 內存的檔名；ImageSrc 是後端組好的完整 R2 圖片網址。
        public string? ImageName { get; set; }
        public string ImageSrc { get; set; } = "";

        // 配件線稿與遮罩圖片。
        public string? LineImageName { get; set; }
        public string LineImageSrc { get; set; } = "";
        public string? MaskImageName { get; set; }
        public string MaskImageSrc { get; set; } = "";

        // 配件圖層排序、頭像框形狀、染劑色碼。
        public int? SortOrder { get; set; }
        public bool? IsSquare { get; set; }
        public string? HexCode { get; set; }

        public int Price { get; set; }
        public bool IsActive { get; set; }

        // 管理員操作紀錄。
        public string? AdminComment { get; set; }
        public DateTime? AdminUpdatedAt { get; set; }
        public string? ModifiedByAdminAccount { get; set; }

        // 前端直接顯示用格式。
        public string PriceFormatted => Price.ToString("N0", CultureInfo.GetCultureInfo("zh-Hant-TW"));
        public string AdminUpdatedAtText => AdminUpdatedAt?.ToString("yyyy-MM-dd HH:mm:ss") ?? "NULL";
        public string ActiveText => IsActive ? "啟用" : "停用";
        public string FrameShape => IsSquare is null ? "NULL" : IsSquare.Value ? "方形" : "圓形";
    }

    // 新增商品 Ajax 表單用 DTO。
    // 因為新增會上傳圖片，所以 Controller 使用 [FromForm] 接收。
    public class CreateShopProductDto
    {
        [Required]
        public string ProductType { get; set; } = "";

        [Required, StringLength(100)]
        public string Name { get; set; } = "";

        // 使用 int? 讓後端可以分辨「沒有輸入價格」與「輸入 0」。
        // Range 只檢查有值時不可小於 0；空值會交給 ShopService 回傳明確訊息。
        [Range(0, int.MaxValue)]
        public int? Price { get; set; }

        // 底圖需要一張圖片。
        public IFormFile? BodyImage { get; set; }

        // 配件需要線稿、遮罩、圖層排序。
        public IFormFile? AccessoryLineImage { get; set; }
        public IFormFile? AccessoryMaskImage { get; set; }
        public int? AccessorySortOrder { get; set; }

        // 頭像框需要圖片與形狀。
        public IFormFile? FrameImage { get; set; }
        public bool? IsSquare { get; set; }

        // 染劑只需要色碼。
        [RegularExpression("^#[0-9a-fA-F]{6}$")]
        public string? HexCode { get; set; }
    }

    // 上下架 Ajax 用 DTO。
    public class UpdateShopProductStatusDto
    {
        public int ProductId { get; set; }
        public bool IsActive { get; set; }

        [Required, StringLength(100)]
        public string Reason { get; set; } = "";
    }

    // 修改價格 Ajax 用 DTO。
    public class UpdateShopProductPriceDto
    {
        public int ProductId { get; set; }

        [Range(0, int.MaxValue)]
        public int Price { get; set; }

        [Required, StringLength(100)]
        public string Reason { get; set; } = "";
    }

    // 修改配件圖層排序 Ajax 用 DTO。
    public class UpdateShopAccessorySortDto
    {
        public int ProductId { get; set; }

        // 前端可選 1-7，但 4 保留給底圖；4 會在 ShopService 的商業規則中擋下。
        [Range(1, 7)]
        public int SortOrder { get; set; }

        [Required, StringLength(100)]
        public string Reason { get; set; } = "";
    }
}
