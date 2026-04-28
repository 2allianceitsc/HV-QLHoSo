# HV-QLHoSo — Tech Stack

> **Người điền:** _______________
> **Ngày cập nhật:** _______________
> **Phiên bản:** 1.0.0

---

## 1. TỔNG QUAN DỰ ÁN

| Câu hỏi | Trả lời |
|---------|---------|
| Tên hệ thống chính thức | |
| Mô tả ngắn (1-2 câu) | |
| Số lượng người dùng dự kiến (concurrent) | |
| Ngôn ngữ giao diện | |
| Môi trường triển khai (cloud / on-premise / hybrid) | |

---

## 2. FRONTEND

| Câu hỏi | Trả lời |
|---------|---------|
| Framework chính (Next.js / Nuxt / React / Vue / Angular / khác) | |
| Ngôn ngữ (TypeScript / JavaScript) | |
| Thư viện UI component (Tailwind / Ant Design / MUI / shadcn / khác) | |
| Thư viện quản lý state (Zustand / Redux / Pinia / React Query / khác) | |
| Thư viện form & validation (React Hook Form / Formik / Zod / Yup / khác) | |
| Thư viện biểu đồ / báo cáo (Recharts / Chart.js / ApexCharts / khác) | |
| Rich text editor (nếu cần nhúng ảnh, format nội dung tờ trình) | |
| Thư viện icon | |
| Hỗ trợ đa ngôn ngữ (i18n)? Nếu có, dùng thư viện gì? | |
| Dark mode? | |

---

## 3. BACKEND

| Câu hỏi | Trả lời |
|---------|---------|
| Ngôn ngữ backend (Node.js / Python / Java / Go / C# / PHP / khác) | |
| Framework (Express / NestJS / FastAPI / Django / Spring Boot / .NET / Laravel / khác) | |
| Kiến trúc API (REST / GraphQL / tRPC / gRPC) | |
| Xác thực (JWT / Session / OAuth2 / khác) | |
| Thư viện ORM / query builder | |
| Validation schema (Zod / Joi / class-validator / Pydantic / khác) | |
| Background job / queue (Bull / BullMQ / Celery / Hangfire / khác) | |
| WebSocket (nếu cần real-time notification) | |
| API documentation (Swagger / OpenAPI / khác) | |

---

## 4. DATABASE

| Câu hỏi | Trả lời |
|---------|---------|
| Database chính (PostgreSQL / MySQL / SQL Server / MongoDB / khác) | |
| Version cụ thể | |
| Full-text search (tích hợp sẵn / Elasticsearch / Meilisearch / khác) | |
| Caching layer (Redis / Memcached / in-memory / không cần) | |
| Migration tool (Flyway / Liquibase / Prisma Migrate / Alembic / khác) | |
| Backup strategy (tần suất, thời gian lưu trữ, vị trí) | |

---

## 5. FILE STORAGE

| Câu hỏi | Trả lời |
|---------|---------|
| Lưu trữ file đính kèm (AWS S3 / Google Cloud Storage / Azure Blob / MinIO / local disk / khác) | |
| Giới hạn kích thước file tối đa | |
| Các định dạng file được phép upload | |
| Có cần scan virus không? Nếu có, dùng gì? | |
| CDN cho file tĩnh / ảnh? | |

---

## 6. EMAIL

| Câu hỏi | Trả lời |
|---------|---------|
| Dịch vụ gửi email (SendGrid / AWS SES / Mailgun / SMTP nội bộ / khác) | |
| Template engine cho email (Handlebars / MJML / React Email / khác) | |
| Địa chỉ email gửi đi (from address) | |

---

## 7. AUTHENTICATION & SECURITY

| Câu hỏi | Trả lời |
|---------|---------|
| Access token TTL (thời gian hết hạn) | |
| Refresh token TTL | |
| Lưu refresh token ở đâu (httpOnly cookie / localStorage / khác) | |
| Chính sách mật khẩu (độ dài tối thiểu, yêu cầu ký tự) | |
| Số lần đăng nhập sai tối đa trước khi khóa | |
| Có cần 2FA (Two-Factor Authentication) không? | |
| Rate limiting API (bao nhiêu request / phút) | |
| CORS origin được phép | |

---

## 8. DEPLOYMENT & INFRASTRUCTURE

| Câu hỏi | Trả lời |
|---------|---------|
| Cloud provider (AWS / GCP / Azure / DigitalOcean / Hetzner / khác) | |
| Hosting frontend (Vercel / Netlify / Cloudflare Pages / self-hosted / khác) | |
| Hosting backend (Docker / Kubernetes / serverless / VM / khác) | |
| Container (Docker? Docker Compose cho dev?) | |
| Số môi trường (dev / staging / production) | |
| Domain và SSL (Let's Encrypt / mua cert / khác) | |
| Reverse proxy / load balancer (Nginx / Traefik / Caddy / khác) | |

---

## 9. CI/CD

| Câu hỏi | Trả lời |
|---------|---------|
| CI/CD platform (GitHub Actions / GitLab CI / Jenkins / Bitbucket Pipelines / khác) | |
| Git hosting (GitHub / GitLab / Bitbucket / Azure DevOps / khác) | |
| Git branching strategy (GitFlow / trunk-based / khác) | |
| Tự động deploy khi merge vào nhánh nào? | |
| Có chạy test tự động trước khi deploy không? | |

---

## 10. MONITORING & LOGGING

| Câu hỏi | Trả lời |
|---------|---------|
| Logging (Winston / Pino / ELK Stack / Datadog / Loki / khác) | |
| Error tracking (Sentry / Bugsnag / khác) | |
| Uptime monitoring (UptimeRobot / Better Uptime / Grafana / khác) | |
| Performance monitoring (APM) | |
| Ai nhận alert khi hệ thống có sự cố? | |

---

## 11. PHÁT TRIỂN & QUY TRÌNH

| Câu hỏi | Trả lời |
|---------|---------|
| Công cụ quản lý task / issue (Jira / Linear / Trello / Notion / GitHub Issues / khác) | |
| Tài liệu nội bộ lưu ở đâu (Notion / Confluence / Google Docs / khác) | |
| Code review bắt buộc trước khi merge? Tối thiểu mấy người approve? | |
| Lint / format (ESLint / Prettier / khác) | |
| Testing (Jest / Vitest / Playwright / Cypress — unit / integration / e2e) | |
| Có cần mock API trong giai đoạn dev frontend không? | |

---

## 12. GHI CHÚ & RÀNG BUỘC ĐẶC BIỆT

> _(Ghi lại bất kỳ yêu cầu kỹ thuật đặc biệt, ràng buộc bảo mật, chính sách công ty, hoặc lý do phải chọn một công nghệ cụ thể)_

| Nội dung | Chi tiết |
|---------|---------|
| Ràng buộc bảo mật / compliance | |
| Công nghệ bắt buộc phải dùng (do IT nội bộ quy định) | |
| Công nghệ không được dùng (lý do) | |
| Ngân sách hạ tầng hàng tháng (ước tính) | |
| Deadline MVP / go-live | |
| Ghi chú khác | |
