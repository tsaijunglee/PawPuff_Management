using Amazon.S3;
using Amazon.S3.Model;

namespace PawPuff_Management.Models.Services
{
	public class R2Service
	{
		private readonly IConfiguration _configuration;
		private readonly AmazonS3Client _s3Client;
		private readonly string _bucketName;
		private readonly string _publicUrl;

		public R2Service(IConfiguration configuration)
		{
			_configuration = configuration;

			// 讀取設定檔
			var serviceUrl = _configuration["CloudflareR2:ServiceUrl"];
			var accessKey = _configuration["CloudflareR2:AccessKey"];
			var secretKey = _configuration["CloudflareR2:SecretKey"];
			_bucketName = _configuration["CloudflareR2:BucketName"];
			_publicUrl = _configuration["CloudflareR2:PublicUrl"];

			// 初始化 S3 客戶端（設定指向 Cloudflare R2）
			var config = new AmazonS3Config
			{
				ServiceURL = serviceUrl,
				ForcePathStyle = true
			};

			_s3Client = new AmazonS3Client(accessKey, secretKey, config);
		}

		/// <summary>
		/// 上傳圖片至 Cloudflare R2（支援指定模擬資料夾）
		/// </summary>
		public async Task<string> UploadImageAsync(IFormFile file, string folder)
		{
			if (file == null || file.Length == 0)
				throw new ArgumentException("檔案無效。");

			var fileExtension = Path.GetExtension(file.FileName).ToLower();
			var newFileName = $"{Guid.NewGuid()}{fileExtension}";

			// 1. 【新增核心邏輯】處理資料夾前綴
			// 如果有帶資料夾名稱，就整理成 "folder/"，否則保持空字串
			var folderPrefix = string.IsNullOrWhiteSpace(folder) ? "" : $"{folder.Trim('/')}/";
			var objectKey = $"{folderPrefix}{newFileName}"; // 組合出最終在 R2 的完整路徑

			using (var newStream = new MemoryStream())
			{
				await file.CopyToAsync(newStream);

				var putRequest = new PutObjectRequest
				{
					BucketName = _bucketName,
					Key = objectKey, // 👈 2. 這裡改用組合好資料夾路徑的 objectKey
					InputStream = newStream,
					ContentType = file.ContentType,

					// 【重要修正】關閉 Payload Signing 才能與 Cloudflare R2 相容
					DisablePayloadSigning = true
				};

				// 送出上傳請求
				await _s3Client.PutObjectAsync(putRequest);
			}

			// 確保基底網址結尾有斜線
			var baseUrl = _publicUrl.EndsWith("/") ? _publicUrl : _publicUrl + "/";

			// 👈 3. 回傳網址改用 objectKey，這樣產出的圖片連結才會是 https://yourdomain.com/folder/filename.jpg
			return $"{baseUrl}{objectKey}";
		}
	}
}
