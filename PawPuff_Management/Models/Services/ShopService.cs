using PawPuff_Management.Models.DTOs;
using PawPuff_Management.Models.EfModels;
using PawPuff_Management.Models.Repositories;
using PawPuff_Management.Models.ViewModels;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Http;


namespace PawPuff_Management.Models.Services
{
    //用途：
    //Service 層負責商業流程：
    //1. 從 Repository 取得 EF Entity。
    //2. 將 Entity 轉成 ShopProductDto。
    //3. 呼叫 ShopImageService 組 R2 圖片網址。
    //4. 新增商品時依類型新增 DollBody / DollAccessory / DollColor / DollFrame，再新增 Product。
    //5. Ajax 修改狀態、價格、排序後，回傳最新 DTO 給前端局部更新畫面。
    public interface IShopService
    {
        Task<ShopIndexViewModel> GetIndexViewModelAsync(string actorAdminAccount);
        Task<ShopProductDto> CreateAsync(CreateShopProductDto dto, string actorAdminAccount);
        Task<ShopProductDto> UpdateStatusAsync(UpdateShopProductStatusDto dto, string actorAdminAccount);
        Task<ShopProductDto> UpdatePriceAsync(UpdateShopProductPriceDto dto, string actorAdminAccount);
        Task<ShopProductDto> UpdateAccessorySortAsync(UpdateShopAccessorySortDto dto, string actorAdminAccount);
    }

    public class ShopService : IShopService
    {
        // R2 上的商城圖片資料夾。
        // 最終網址會是 CloudflareR2:PublicUrl + /webshop/body|accessory|frame + /檔名。
        private const string BodyFolder = "webshop/body";
        private const string AccessoryLineFolder = "webshop/accessory/line";
        private const string AccessoryMaskFolder = "webshop/accessory/mask";
        private const string FrameFolder = "webshop/frame";

        // products.product_type 在資料庫內目前使用英文代碼。
        // 前端畫面與既有 JS 則使用中文名稱，所以 Service 統一負責雙向轉換。
        private const string BodyType = "body";
        private const string AccessoryType = "accessory";
        private const string FrameType = "frame";
        private const string ColorType = "color";

        // doll_body 在素材疊圖規則中固定佔用第 4 層。
        // EF Model 目前沒有 doll_body.sort_order 欄位，所以這裡以服務層規則表達。
        private const int BodySortOrder = 4;

        // 配件可用圖層為 1-7，但 4 保留給底圖 doll_body 使用，所以配件不可選 4。
        private static readonly HashSet<int> AllowedSortOrders = new() { 1, 2, 3, 5, 6, 7 };

        private readonly IShopRepository _repo;
        private readonly IShopImageService _shopImageService;

        public ShopService(IShopRepository repo, IShopImageService shopImageService)
        {
            _repo = repo;
            _shopImageService = shopImageService;
        }

        // 讀取商城首頁資料。
        // Controller 呼叫此方法後，把 ViewModel 傳給 Index.cshtml。
        public async Task<ShopIndexViewModel> GetIndexViewModelAsync(string actorAdminAccount)
        {
            var products = await _repo.GetProductsWithDetailsAsync();

            return new ShopIndexViewModel
            {
                ActorAdminAccount = actorAdminAccount,
                Products = products.Select(Map).ToList()
            };
        }

        // Ajax 新增商品。
        // 因為一次新增會碰到 Doll* 表與 Product 表，所以使用 Transaction。
        public async Task<ShopProductDto> CreateAsync(CreateShopProductDto dto, string actorAdminAccount)
        {
            ValidateCreateDto(dto);
            await ValidateCreateUniqueAsync(dto);

            var dbProductType = ToDbProductType(dto.ProductType);
            var productName = dto.Name.Trim();

            await using var tx = await _repo.BeginTransactionAsync();

            var product = new Product
            {
                Name = productName,
                // DB 內統一存英文代碼，避免新舊資料混用中文/英文類型。
                ProductType = dbProductType,
                Price = dto.Price!.Value,
                // 新增商品預設不上架，避免素材剛上傳就直接出現在前台。
                IsActive = false
            };

            if (dbProductType == BodyType)
            {
                // 上傳到 R2：PublicUrl/webshop/body/檔名。
                // DollBody.ImageName 只存檔名。
                var upload = await _shopImageService.UploadAsync(dto.BodyImage!, BodyFolder);

                var body = new DollBody
                {
                    Name = productName,
                    ImageName = upload.FileName
                };

                await _repo.AddBodyAsync(body);
                await _repo.SaveChangesAsync();

                product.DollBodyId = body.Id;
            }
            else if (dbProductType == AccessoryType)
            {
                // 配件線稿與遮罩分別放到不同 R2 子資料夾：
                // 線稿：PublicUrl/webshop/accessory/line/檔名
                // 遮罩：PublicUrl/webshop/accessory/mask/檔名
                var line = await _shopImageService.UploadAsync(dto.AccessoryLineImage!, AccessoryLineFolder);
                var mask = await _shopImageService.UploadAsync(dto.AccessoryMaskImage!, AccessoryMaskFolder);

                var accessory = new DollAccessory
                {
                    Name = productName,
                    LineImageName = line.FileName,
                    MaskImageName = mask.FileName,
                    SortOrder = dto.AccessorySortOrder ?? 1
                };

                await _repo.AddAccessoryAsync(accessory);
                await _repo.SaveChangesAsync();

                product.DollAccessoryId = accessory.Id;
            }
            else if (dbProductType == FrameType)
            {
                // 頭像框圖片放到 webshop/frame。
                var upload = await _shopImageService.UploadAsync(dto.FrameImage!, FrameFolder);

                var frame = new DollFrame
                {
                    Name = productName,
                    ImageName = upload.FileName,
                    IsSquare = dto.IsSquare ?? true
                };

                await _repo.AddFrameAsync(frame);
                await _repo.SaveChangesAsync();

                product.DollFramesId = frame.Id;
            }
            else if (dbProductType == ColorType)
            {
                // 染劑不需要圖片，只需要色碼。
                var color = new DollColor
                {
                    Name = productName,
                    HexCode = NormalizeHexCode(dto.HexCode)
                };

                await _repo.AddColorAsync(color);
                await _repo.SaveChangesAsync();

                product.DollColorsId = color.Id;
            }

            await ApplyAudit(product, "新增商品", actorAdminAccount);

            await _repo.AddProductAsync(product);
            await _repo.SaveChangesAsync();
            await tx.CommitAsync();

            // 回傳完整 DTO，前端 Ajax 成功後直接新增表格列與縮圖。
            return await GetProductDto(product.Id);
        }

        // Ajax 上下架。
        public async Task<ShopProductDto> UpdateStatusAsync(UpdateShopProductStatusDto dto, string actorAdminAccount)
        {
            var product = await FindProduct(dto.ProductId);

            product.IsActive = dto.IsActive;
            await ApplyAudit(product, dto.Reason, actorAdminAccount);

            await _repo.SaveChangesAsync();

            return await GetProductDto(product.Id);
        }

        // Ajax 修改價格。
        public async Task<ShopProductDto> UpdatePriceAsync(UpdateShopProductPriceDto dto, string actorAdminAccount)
        {
            if (dto.Price < 0)
                throw new InvalidOperationException("價格不可小於 0。");

            var adminComment = dto.Reason.Trim();
            if (string.IsNullOrWhiteSpace(adminComment))
                throw new InvalidOperationException("請輸入修改說明。");

            var adminUpdatedAt = DateTime.Now;
            var modifiedByAdminId = await _repo.GetAdminIdByAccountAsync(actorAdminAccount);
            var affectedRows = await _repo.UpdateProductPriceAsync(
                dto.ProductId,
                dto.Price,
                adminComment,
                adminUpdatedAt,
                modifiedByAdminId);

            if (affectedRows == 0)
                throw new KeyNotFoundException("找不到商品。");

            // 重新從資料庫查一次，確保回傳給前端的是已寫入 DB 的最新價格。
            return await GetProductDto(dto.ProductId);
        }

        // Ajax 修改配件圖層排序。
        public async Task<ShopProductDto> UpdateAccessorySortAsync(UpdateShopAccessorySortDto dto, string actorAdminAccount)
        {
            if (!AllowedSortOrders.Contains(dto.SortOrder))
                throw new InvalidOperationException("圖層排序不合法。");

            var product = await FindProduct(dto.ProductId);

            if (product.DollAccessoryId is null)
                throw new InvalidOperationException("只有配件可以修改圖層排序。");

            var accessory = await _repo.FindAccessoryForUpdateAsync(product.DollAccessoryId.Value)
                ?? throw new KeyNotFoundException("找不到配件資料。");

            accessory.SortOrder = dto.SortOrder;
            await ApplyAudit(product, dto.Reason, actorAdminAccount);

            await _repo.SaveChangesAsync();

            return await GetProductDto(product.Id);
        }

        private static void ValidateCreateDto(CreateShopProductDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.ProductType))
                throw new InvalidOperationException("請選擇商品類型。");

            if (string.IsNullOrWhiteSpace(dto.Name))
                throw new InvalidOperationException("請輸入商品名稱。");

            if (dto.Price is null)
                throw new InvalidOperationException("請輸入價格。");

            if (dto.Price < 0)
                throw new InvalidOperationException("價格不可小於 0。");

            var dbProductType = ToDbProductType(dto.ProductType);

            if (dbProductType == BodyType && IsMissingFile(dto.BodyImage))
                throw new InvalidOperationException("請上傳底圖圖片。");

            if (dbProductType == AccessoryType)
            {
                if (IsMissingFile(dto.AccessoryLineImage))
                    throw new InvalidOperationException("請上傳配件線稿圖片。");

                if (IsMissingFile(dto.AccessoryMaskImage))
                    throw new InvalidOperationException("請上傳配件遮罩圖片。");

                if (dto.AccessorySortOrder is null || !AllowedSortOrders.Contains(dto.AccessorySortOrder.Value))
                    throw new InvalidOperationException("請選擇有效圖層排序。");
            }

            if (dbProductType == FrameType && IsMissingFile(dto.FrameImage))
                throw new InvalidOperationException("請上傳頭像框圖片。");

            if (dbProductType == ColorType && !IsValidHexCode(dto.HexCode))
                throw new InvalidOperationException("請選擇有效染劑色碼。");
        }

        private async Task ValidateCreateUniqueAsync(CreateShopProductDto dto)
        {
            var productName = dto.Name.Trim();

            // 新增底圖、配件、頭像框、染劑都會共用 Product.Name 作為商品名稱。
            // Repository 會同時檢查 products 與四張 Doll* 表，確認名稱沒有被既有資料使用。
            if (await _repo.ProductNameExistsAsync(productName))
                throw new InvalidOperationException("商品名稱不可重複。");

            var dbProductType = ToDbProductType(dto.ProductType);
            if (dbProductType == ColorType)
            {
                var hexCode = NormalizeHexCode(dto.HexCode);
                if (await _repo.ColorHexCodeExistsAsync(hexCode))
                    throw new InvalidOperationException("顏色色號不可重複。");
            }
        }

        private static string NormalizeHexCode(string? hexCode) =>
            hexCode?.Trim().ToUpperInvariant() ?? "";

        private static bool IsMissingFile(IFormFile? file) =>
            file is null || file.Length == 0;

        private static bool IsValidHexCode(string? hexCode) =>
            Regex.IsMatch(NormalizeHexCode(hexCode), "^#[0-9A-F]{6}$");

        private static string ToDbProductType(string? productType)
        {
            return (productType ?? "").Trim().ToLowerInvariant() switch
            {
                "底圖" or BodyType => BodyType,
                "配件" or AccessoryType => AccessoryType,
                "頭像框" or FrameType => FrameType,
                "染劑" or ColorType => ColorType,
                _ => throw new InvalidOperationException("商品類型不正確。")
            };
        }

        private static string ToDisplayProductType(string productType)
        {
            return ToDbProductType(productType) switch
            {
                BodyType => "底圖",
                AccessoryType => "配件",
                FrameType => "頭像框",
                ColorType => "染劑",
                _ => productType
            };
        }

        private async Task<Product> FindProduct(int id) =>
            await _repo.FindProductForUpdateAsync(id)
            ?? throw new KeyNotFoundException("找不到商品。");

        private async Task ApplyAudit(Product product, string reason, string actorAdminAccount)
        {
            product.AdminComment = reason.Trim();
            product.AdminUpdatedAt = DateTime.Now;
            product.ModifiedByAdminId = await _repo.GetAdminIdByAccountAsync(actorAdminAccount);
        }

        private async Task<ShopProductDto> GetProductDto(int id) =>
            Map(await _repo.GetProductWithDetailsAsync(id)
            ?? throw new KeyNotFoundException("找不到商品。"));

        // 將 EF Entity 轉成前端需要的 DTO。
        // 圖片完整網址在這裡集中處理，View 和 JS 不需要知道 R2 資料夾規則。
        private ShopProductDto Map(Product p)
        {
            var dbProductType = ToDbProductType(p.ProductType);

            var imageName = dbProductType == BodyType ? p.DollBody?.ImageName :
                            dbProductType == FrameType ? p.DollFrames?.ImageName : null;

            var imageFolder = dbProductType == BodyType ? BodyFolder :
                              dbProductType == FrameType ? FrameFolder : "";

            return new ShopProductDto
            {
                Id = p.Id,
                Name = p.Name,
                // DTO 給 View/JS 使用中文，讓既有前端判斷與下拉選單可以沿用。
                ProductType = ToDisplayProductType(p.ProductType),
                BodyId = p.DollBodyId,
                AccessoryId = p.DollAccessoryId,
                FramesId = p.DollFramesId,
                ColorsId = p.DollColorsId,

                ImageName = imageName,
                ImageSrc = string.IsNullOrWhiteSpace(imageName)
                    ? ""
                    : _shopImageService.BuildPublicUrl(imageFolder, imageName),

                LineImageName = p.DollAccessory?.LineImageName,
                LineImageSrc = string.IsNullOrWhiteSpace(p.DollAccessory?.LineImageName)
                    ? ""
                    : _shopImageService.BuildPublicUrl(AccessoryLineFolder, p.DollAccessory.LineImageName),

                MaskImageName = p.DollAccessory?.MaskImageName,
                MaskImageSrc = string.IsNullOrWhiteSpace(p.DollAccessory?.MaskImageName)
                    ? ""
                    : _shopImageService.BuildPublicUrl(AccessoryMaskFolder, p.DollAccessory.MaskImageName),

                SortOrder = dbProductType == BodyType ? BodySortOrder : p.DollAccessory?.SortOrder,
                IsSquare = p.DollFrames?.IsSquare,
                HexCode = p.DollColors?.HexCode,
                Price = p.Price,
                IsActive = p.IsActive,
                AdminComment = p.AdminComment,
                AdminUpdatedAt = p.AdminUpdatedAt,
                ModifiedByAdminAccount = p.ModifiedByAdmin?.Account
            };
        }
    }

}
