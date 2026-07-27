namespace PawPuff_Management.Models.Services
{
    // 上傳後回傳兩份資訊：
    // FileName：寫進 DB 的檔名。
    // Url：可直接顯示圖片的完整 R2 公開網址。
    public record ShopImageUploadResult(string FileName, string Url);

    public interface IShopImageService
    {
        string BuildPublicUrl(string folder, string? fileName);
        Task<ShopImageUploadResult> UploadAsync(IFormFile file, string folder);
    }

    public class ShopImageService : IShopImageService
    {
        private readonly R2Service _r2Service;
        private readonly string _publicUrl;

        public ShopImageService(R2Service r2Service, IConfiguration configuration)
        {
            _r2Service = r2Service;

            // 直接使用原本 appsettings.json 裡既有的 CloudflareR2:PublicUrl。
            // 不需要新增或修改 appsettings.json。
            _publicUrl = configuration["CloudflareR2:PublicUrl"]
                ?? throw new InvalidOperationException("找不到 CloudflareR2:PublicUrl 設定。");
        }

        // 用於查詢列表與查看詳情：
        // DB 只存 b1.png / al1.png / f1.png，這裡補上 PublicUrl 與資料夾路徑。
        public string BuildPublicUrl(string folder, string? fileName)
        {
            if (string.IsNullOrWhiteSpace(fileName)) return "";

            var baseUrl = _publicUrl.TrimEnd('/');
            var objectKey = $"{folder.Trim('/')}/{fileName.Trim('/')}";

            return $"{baseUrl}/{objectKey}";
        }

        // 用於新增商品：
        // 這裡不改 R2Service，而是呼叫既有 UploadImageAsync。
        public async Task<ShopImageUploadResult> UploadAsync(IFormFile file, string folder)
        {
            var url = await _r2Service.UploadImageAsync(file, folder);
            var fileName = ExtractFileName(url);

            if (string.IsNullOrWhiteSpace(fileName))
                throw new InvalidOperationException("圖片上傳成功，但無法取得檔名。");

            return new ShopImageUploadResult(fileName, url);
        }

        // R2Service.UploadImageAsync 會回傳完整網址，例如：
        // https://...r2.dev/webshop/body/xxxx.png
        // DB 只需要最後的 xxxx.png。
        private static string ExtractFileName(string url)
        {
            if (Uri.TryCreate(url, UriKind.Absolute, out var uri))
            {
                return uri.AbsolutePath
                    .Split('/', StringSplitOptions.RemoveEmptyEntries)
                    .LastOrDefault() ?? "";
            }

            return url
                .Split('/', StringSplitOptions.RemoveEmptyEntries)
                .LastOrDefault() ?? "";
        }
    }
}
