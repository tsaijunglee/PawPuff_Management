using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using PawPuff_Management.Models.EfModels;


namespace PawPuff_Management.Models.Repositories
{
    public interface IShopRepository
    {
        Task<IReadOnlyList<Product>> GetProductsWithDetailsAsync();
        Task<Product?> GetProductWithDetailsAsync(int id);
        Task<Product?> FindProductForUpdateAsync(int id);
        Task<DollAccessory?> FindAccessoryForUpdateAsync(int id);
        Task<int?> GetAdminIdByAccountAsync(string account);
        Task<bool> ProductNameExistsAsync(string name);
        Task<bool> ColorHexCodeExistsAsync(string hexCode);
        Task<int> UpdateProductPriceAsync(int productId, int price, string adminComment, DateTime adminUpdatedAt, int? modifiedByAdminId);

        Task AddProductAsync(Product product);
        Task AddBodyAsync(DollBody body);
        Task AddAccessoryAsync(DollAccessory accessory);
        Task AddFrameAsync(DollFrame frame);
        Task AddColorAsync(DollColor color);

        Task<IDbContextTransaction> BeginTransactionAsync();
        Task SaveChangesAsync();
    }

    public class ShopRepository : IShopRepository
    {
        private readonly PawPuffContext _context;

        public ShopRepository(PawPuffContext context)
        {
            _context = context;
        }

        // 集中定義商品列表需要 Include 的關聯資料。
        // Product 是主表，依商品類型可能連到 DollBody、DollAccessory、DollColor、DollFrame 其中一種。
        private IQueryable<Product> ProductsWithDetails() =>
            _context.Products
                .Include(p => p.DollBody)
                .Include(p => p.DollAccessory)
                .Include(p => p.DollColors)
                .Include(p => p.DollFrames)
                .Include(p => p.ModifiedByAdmin);

        // 列表頁使用 AsNoTracking，因為只是讀取顯示，不需要 EF 追蹤狀態。
        public async Task<IReadOnlyList<Product>> GetProductsWithDetailsAsync() =>
            await ProductsWithDetails()
                .AsNoTracking()
                .OrderBy(p => p.Id)
                .ToListAsync();

        // Ajax 修改成功後，用這個重新查詢完整商品資料並回傳給前端更新畫面。
        public Task<Product?> GetProductWithDetailsAsync(int id) =>
            ProductsWithDetails()
                .AsNoTracking()
                .FirstOrDefaultAsync(p => p.Id == id);

        // 修改 Product 欄位時要使用可追蹤 Entity，所以不能 AsNoTracking。
        public Task<Product?> FindProductForUpdateAsync(int id) =>
            _context.Products.FirstOrDefaultAsync(p => p.Id == id);

        // 修改配件排序時，需要更新 DollAccessory.SortOrder。
        public Task<DollAccessory?> FindAccessoryForUpdateAsync(int id) =>
            _context.DollAccessories.FirstOrDefaultAsync(a => a.Id == id);

        // 將目前管理員帳號轉成 admins.id，寫入 Product.ModifiedByAdminId。
        public Task<int?> GetAdminIdByAccountAsync(string account) =>
            _context.Admins
                .Where(a => a.Account == account)
                .Select(a => (int?)a.Id)
                .FirstOrDefaultAsync();

        // 新增商品前檢查商品名稱是否已存在。
        // Product 是商城主表，但新增時也會同步寫入 DollBody / DollAccessory / DollFrame / DollColor。
        // 因此這裡一次檢查五張表，避免名稱已存在於素材表時，等到 SaveChanges 才被 DB 唯一索引擋下。
        public async Task<bool> ProductNameExistsAsync(string name)
        {
            var normalizedName = name.Trim();

            return await _context.Products.AsNoTracking().AnyAsync(p => p.Name == normalizedName)
                || await _context.DollBodies.AsNoTracking().AnyAsync(b => b.Name == normalizedName)
                || await _context.DollAccessories.AsNoTracking().AnyAsync(a => a.Name == normalizedName)
                || await _context.DollFrames.AsNoTracking().AnyAsync(f => f.Name == normalizedName)
                || await _context.DollColors.AsNoTracking().AnyAsync(c => c.Name == normalizedName);
        }

        // 新增染劑前檢查 doll_colors.hex_code 是否已存在，避免色號重複。
        public Task<bool> ColorHexCodeExistsAsync(string hexCode) =>
            _context.DollColors
                .AsNoTracking()
                .AnyAsync(c => c.HexCode == hexCode);

        // 修改商品價格時直接對 products 表送出 UPDATE。
        // 這樣可以避免只改到前端資料或 EF 追蹤狀態造成誤判；affected rows 為 0 代表沒有該商品。
        public Task<int> UpdateProductPriceAsync(int productId, int price, string adminComment, DateTime adminUpdatedAt, int? modifiedByAdminId) =>
            _context.Products
                .Where(p => p.Id == productId)
                .ExecuteUpdateAsync(setters => setters
                    .SetProperty(p => p.Price, price)
                    .SetProperty(p => p.AdminComment, adminComment)
                    .SetProperty(p => p.AdminUpdatedAt, adminUpdatedAt)
                    .SetProperty(p => p.ModifiedByAdminId, modifiedByAdminId));

        public async Task AddProductAsync(Product product) =>
            await _context.Products.AddAsync(product);

        public async Task AddBodyAsync(DollBody body) =>
            await _context.DollBodies.AddAsync(body);

        public async Task AddAccessoryAsync(DollAccessory accessory) =>
            await _context.DollAccessories.AddAsync(accessory);

        public async Task AddFrameAsync(DollFrame frame) =>
            await _context.DollFrames.AddAsync(frame);

        public async Task AddColorAsync(DollColor color) =>
            await _context.DollColors.AddAsync(color);

        // 新增商品會同時新增 Doll* 與 Product，因此用交易確保資料庫寫入一致。
        public Task<IDbContextTransaction> BeginTransactionAsync() =>
            _context.Database.BeginTransactionAsync();

        public Task SaveChangesAsync() =>
            _context.SaveChangesAsync();
    }
}
