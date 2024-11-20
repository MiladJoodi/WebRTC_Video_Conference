import axios, { AxiosInstance, AxiosResponse, InternalAxiosRequestConfig, AxiosHeaders } from "axios";

// تعریف axiosInstance با baseURL اولیه
const axiosInstance: AxiosInstance = axios.create({
  baseURL: "https://auth.cog-tasmim.ir/api/authorization",
  // baseURL: process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000",
});

// تعریف axiosInstance Video Conf با baseURL جدید
const axiosInstanceVC: AxiosInstance = axios.create({
  baseURL: "https://vc.cog-tasmim.ir/apis",
});

// تابع اضافه کردن interceptors به هر instance
const addInterceptors = (instance: AxiosInstance): void => {
  instance.interceptors.request.use((config) => {
    const token = localStorage.getItem("accessToken"); // دریافت توکن از لوکال استوریج
    if (token) {
      if (!config.headers) {
        config.headers = new AxiosHeaders(); // ساختن یک AxiosHeaders جدید در صورت undefined بودن
      }
      config.headers.set("Authorization", `Bearer ${token}`); // اضافه کردن هدر Authorization
    }
    return config as InternalAxiosRequestConfig; // تبدیل نوع config به InternalAxiosRequestConfig
  });

  instance.interceptors.response.use(
    (response: AxiosResponse) => response,
    (error) => {
      // مدیریت خطاهای عمومی
      return Promise.reject(error);
    }
  );
};

// اضافه کردن اینترسپتور به هر دو instance ها
addInterceptors(axiosInstance);
addInterceptors(axiosInstanceVC);

// صادرات به صورت default برای axiosInstance اصلی
export default axiosInstance;
export { axiosInstanceVC };
