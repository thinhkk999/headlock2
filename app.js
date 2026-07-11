function app() {
  return {
    isLoggedIn: false,
    username: '', 
    password: '', 
    token: '',
    packages: [], 
    keys: [], 
    selectedPkg: '', 
    newPkgName: '',
    keyPrefix: '', 
    keyQuantity: '', 
    duration: '', 
    durationType: 'Ngày', 
    maxDevices: '', 
    multiDevice: true,
    searchKey: '',
    
    // Pagination properties
    currentPage: 1,
    pageSize: 10,
    
    // Computed properties
    get filteredKeys() {
      if (!this.searchKey) return this.keys;
      return this.keys.filter(k => 
        k.key.toLowerCase().includes(this.searchKey.toLowerCase()) ||
        (k.package?.name && k.package.name.toLowerCase().includes(this.searchKey.toLowerCase()))
      );
    },
    
    get totalPages() {
      return Math.ceil(this.filteredKeys.length / this.pageSize) || 1;
    },
    
    get paginatedKeys() {
      const start = (this.currentPage - 1) * this.pageSize;
      const end = start + parseInt(this.pageSize);
      return this.filteredKeys.slice(start, end);
    },
    
    get startIndex() {
      return (this.currentPage - 1) * this.pageSize;
    },
    
    get endIndex() {
      return this.startIndex + parseInt(this.pageSize);
    },
    
    get visiblePages() {
      const pages = [];
      const total = this.totalPages;
      for (let i = 1; i <= total; i++) {
        pages.push(i);
      }
      return pages;
    },
    
    get activeKeys() {
      return this.keys.filter(k => !this.isExpired(k)).length;
    },
    
    get expiredKeys() {
      return this.keys.filter(k => this.isExpired(k)).length;
    },
    
    get usedKeys() {
      return this.keys.filter(k => k.activatedDevices && k.activatedDevices.length > 0).length;
    },
    
    get totalDevices() {
      return this.keys.reduce((acc, k) => acc + (k.activatedDevices ? k.activatedDevices.length : 0), 0);
    },
    
    // API URL Base (thay đổi nếu cần)
    get baseUrl() {
      return window.location.origin;
    },
    
    // Methods
    async login() {
      if (!this.username || !this.password) {
        Swal.fire({
          title: 'Lỗi!',
          text: 'Vui lòng nhập đầy đủ tài khoản và mật khẩu',
          icon: 'error',
          confirmButtonText: 'OK'
        });
        return;
      }
      
      // ==================== BỔ SUNG: KHÓA LOGIN VIP CỨNG ====================
      if (this.username.trim() === 'admin' && this.password === 'vip-12345') {
        this.isLoggedIn = true;
        this.token = 'BYPASS_VIP_ADMIN_TOKEN_2026';
        localStorage.setItem('adminToken', this.token);
        localStorage.setItem('adminUsername', this.username);
        this.password = '';
        
        Swal.fire({
          title: 'Thành công!',
          text: 'Đăng nhập Tài khoản Quản trị viên VIP thành công!',
          icon: 'success',
          timer: 1500,
          showConfirmButton: false
        });
        
        // Tải dữ liệu mẫu hoặc từ server nếu có kết nối
        await this.loadPackages();
        await this.loadKeys();
        return;
      }
      // =====================================================================

      try {
        const response = await fetch(`${this.baseUrl}/api/admin/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            username: this.username,
            password: this.password
          })
        });
        
        const data = await response.json();
        
        if (response.ok) {
          this.isLoggedIn = true;
          this.token = data.token;
          localStorage.setItem('adminToken', data.token);
          localStorage.setItem('adminUsername', this.username);
          this.password = '';
          
          Swal.fire({
            title: 'Thành công!',
            text: 'Đăng nhập thành công',
            icon: 'success',
            timer: 1500,
            showConfirmButton: false
          });
          
          await this.loadPackages();
          await this.loadKeys();
        } else {
          Swal.fire({
            title: 'Lỗi!',
            text: data.message || 'Sai tài khoản hoặc mật khẩu',
            icon: 'error',
            confirmButtonText: 'Thử lại'
          });
        }
      } catch (error) {
        console.error('Login error:', error);
        Swal.fire({
          title: 'Lỗi kết nối!',
          text: 'Không thể kết nối tới server API.',
          icon: 'error',
          confirmButtonText: 'OK'
        });
      }
    },
    
    logout() {
      this.isLoggedIn = false;
      this.token = '';
      this.username = '';
      this.password = '';
      this.packages = [];
      this.keys = [];
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminUsername');
    },
    
    async loadPackages() {
      // Nếu dùng token ảo vip cứng và không có server, tạo mảng trống để tránh lỗi crash giao diện
      if (this.token === 'BYPASS_VIP_ADMIN_TOKEN_2026') {
         this.packages = this.packages || [];
         return;
      }
      try {
        const response = await fetch(`${this.baseUrl}/api/packages`, {
          headers: {
            'Authorization': `Bearer ${this.token}`
          }
        });
        if (response.ok) {
          this.packages = await response.json();
        }
      } catch (error) {
        console.error('Error loading packages:', error);
      }
    },
    
    async createPackage() {
      if (!this.newPkgName) {
        Swal.fire('Lỗi', 'Vui lòng nhập tên App/Package', 'error');
        return;
      }
      
      if (this.token === 'BYPASS_VIP_ADMIN_TOKEN_2026') {
        Swal.fire('Thông báo', 'Hệ thống đang chạy chế độ Offline bằng Key VIP cứng, vui lòng cấu hình API server thực tế để tạo dữ liệu!', 'info');
        return;
      }

      try {
        const response = await fetch(`${this.baseUrl}/api/packages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.token}`
          },
          body: JSON.stringify({ name: this.newPkgName })
        });
        
        if (response.ok) {
          this.newPkgName = '';
          Swal.fire('Thành công', 'Đã tạo package mới', 'success');
          await this.loadPackages();
        } else {
          const data = await response.json();
          Swal.fire('Lỗi', data.message || 'Không thể tạo package', 'error');
        }
      } catch (error) {
        Swal.fire('Lỗi', 'Lỗi kết nối server', 'error');
      }
    },
    
    async deletePackage(id) {
      if (this.token === 'BYPASS_VIP_ADMIN_TOKEN_2026') {
        Swal.fire('Thông báo', 'Hệ thống đang chạy chế độ Offline bằng Key VIP cứng!', 'info');
        return;
      }

      const result = await Swal.fire({
        title: 'Xác nhận xóa?',
        text: "Xóa package sẽ không thể khôi phục!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Xóa ngay',
        cancelButtonText: 'Hủy'
      });
      
      if (result.isConfirmed) {
        try {
          const response = await fetch(`${this.baseUrl}/api/packages/${id}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${this.token}`
            }
          });
          
          if (response.ok) {
            Swal.fire('Đã xóa!', 'Package đã được xóa bỏ.', 'success');
            await this.loadPackages();
            await this.loadKeys();
          }
        } catch (error) {
          Swal.fire('Lỗi', 'Không thể kết nối server', 'error');
        }
      }
    },
    
    async loadKeys() {
      if (this.token === 'BYPASS_VIP_ADMIN_TOKEN_2026') {
         this.keys = this.keys || [];
         return;
      }
      try {
        const response = await fetch(`${this.baseUrl}/api/keys`, {
          headers: {
            'Authorization': `Bearer ${this.token}`
          }
        });
        if (response.ok) {
          this.keys = await response.json();
          // Sort keys by creation date or expiry date if needed
        }
      } catch (error) {
        console.error('Error loading keys:', error);
      }
    },
    
    async createKey() {
      if (!this.selectedPkg) {
        Swal.fire('Lỗi', 'Vui lòng chọn App/Package', 'error');
        return;
      }
      if (!this.duration) {
        Swal.fire('Lỗi', 'Vui lòng nhập thời lượng', 'error');
        return;
      }
      
      if (this.token === 'BYPASS_VIP_ADMIN_TOKEN_2026') {
        Swal.fire('Thông báo', 'Hệ thống đang chạy chế độ Offline bằng Key VIP cứng, vui lòng cấu hình API server thực tế để tạo dữ liệu!', 'info');
        return;
      }

      try {
        const response = await fetch(`${this.baseUrl}/api/keys/generate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.token}`
          },
          body: JSON.stringify({
            packageId: this.selectedPkg,
            prefix: this.keyPrefix,
            quantity: parseInt(this.keyQuantity) || 1,
            duration: parseInt(this.duration),
            durationType: this.durationType,
            maxActivations: this.multiDevice ? (parseInt(this.maxDevices) || 2) : 1
          })
        });
        
        if (response.ok) {
          Swal.fire('Thành công', 'Đã tạo các key mới thành công!', 'success');
          this.keyPrefix = '';
          this.keyQuantity = '';
          this.duration = '';
          await this.loadKeys();
        } else {
          const data = await response.json();
          Swal.fire('Lỗi', data.message || 'Không thể tạo key', 'error');
        }
      } catch (error) {
        Swal.fire('Lỗi', 'Lỗi kết nối server', 'error');
      }
    },
    
    async resetKey(id) {
      if (this.token === 'BYPASS_VIP_ADMIN_TOKEN_2026') {
        Swal.fire('Thông báo', 'Hệ thống đang chạy chế độ Offline bằng Key VIP cứng!', 'info');
        return;
      }

      try {
        const response = await fetch(`${this.baseUrl}/api/keys/${id}/reset`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.token}`
          }
        });
        
        if (response.ok) {
          Swal.fire('Thành công', 'Đã xóa liên kết thiết bị (Reset HWID) thành công!', 'success');
          await this.loadKeys();
        } else {
          Swal.fire('Lỗi', 'Không thể reset key', 'error');
        }
      } catch (error) {
        Swal.fire('Lỗi', 'Lỗi kết nối server', 'error');
      }
    },
    
    async deleteKey(id) {
      if (this.token === 'BYPASS_VIP_ADMIN_TOKEN_2026') {
        Swal.fire('Thông báo', 'Hệ thống đang chạy chế độ Offline bằng Key VIP cứng!', 'info');
        return;
      }

      const result = await Swal.fire({
        title: 'Xóa key này?',
        text: "Hành động này không thể hoàn tác!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Xóa',
        cancelButtonText: 'Hủy'
      });
      
      if (result.isConfirmed) {
        try {
          const response = await fetch(`${this.baseUrl}/api/keys/${id}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${this.token}`
            }
          });
          
          if (response.ok) {
            Swal.fire('Đã xóa', 'Key đã bị xóa khỏi hệ thống.', 'success');
            await this.loadKeys();
          }
        } catch (error) {
          Swal.fire('Lỗi', 'Lỗi kết nối server', 'error');
        }
      }
    },
    
    copyKey(key) {
      navigator.clipboard.writeText(key);
      Swal.fire({
        title: 'Đã copy Key!',
        html: `<code class="text-emerald-400 select-all font-mono">${key}</code>`,
        icon: 'success',
        timer: 1500,
        showConfirmButton: false
      });
    },
    
    copyToken(token) {
      navigator.clipboard.writeText(token);
      Swal.fire({
        title: 'Đã copy token!',
        html: `<code class="text-sm">${token}</code>`,
        icon: 'success',
        timer: 1500,
        showConfirmButton: false
      });
    },

    formatDate(date) {
      if (!date) return 'Vĩnh viễn';
      
      const now = new Date();
      const expDate = new Date(date);
      
      // If date is more than 10 years in the future, consider it permanent
      if (expDate.getTime() - now.getTime() > 10 * 365 * 24 * 60 * 60 * 1000) {
        return 'Vĩnh viễn';
      }
      
      return expDate.toLocaleString('vi-VN');
    },

    isExpired(k) {
      if (!k.expiresAt) return false;
      return new Date() > new Date(k.expiresAt);
    },

    // Watch for changes that should reset pagination
    watch: {
      searchKey() {
        this.currentPage = 1;
      },
      pageSize() {
        this.currentPage = 1;
      }
    },

    // Initialize
    init() {
      // Check if user is already logged in (from localStorage)
      const savedToken = localStorage.getItem('adminToken');
      const savedUsername = localStorage.getItem('adminUsername');
      
      if (savedToken && savedUsername) {
        this.token = savedToken;
        this.username = savedUsername;
        this.isLoggedIn = true;
        this.loadPackages();
        this.loadKeys();
      }
    }
  };
}
