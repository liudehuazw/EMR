# ============================================================
#  后端镜像（多阶段构建）
#  构建：docker build -t emr-backend ./backend
#  说明：不需要本地安装 Maven / JDK，也不需要 mvnw 包装器
# ============================================================

# ---------- 阶段 1：构建 ----------
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /build

# 先复制 pom，利用 Docker 层缓存预下载依赖
COPY pom.xml .
RUN mvn -B -q -DskipTests dependency:go-offline || true

# 再复制源码并打包
COPY src ./src
RUN mvn -B -q clean package -DskipTests

# ---------- 阶段 2：运行 ----------
FROM eclipse-temurin:21-jre
WORKDIR /app

ENV TZ=Asia/Shanghai \
    JAVA_OPTS="-Xms128m -Xmx256m"

# pom.xml 版本为 0.0.1-SNAPSHOT，产物名固定，用通配符避免版本号写死
COPY --from=build /build/target/electronic-medical-record-*.jar /app/app.jar

# 本地文件上传目录（可通过 FILE_UPLOAD_PATH 覆盖）
RUN mkdir -p /app/uploads

EXPOSE 8080

# 配置全部通过环境变量注入，见 docker-compose.yml / DEPLOYMENT_GUIDE.md
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar /app/app.jar"]
