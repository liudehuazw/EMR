# 使用官方Java 21运行时作为基础镜像
FROM openjdk:21-jdk-slim

# 设置工作目录
WORKDIR /app

# 复制Maven配置文件
COPY pom.xml .

# 复制Maven wrapper文件（如果存在）
COPY mvnw* ./
COPY .mvn .mvn

# 下载依赖（利用Docker缓存层）
RUN chmod +x mvnw 2>/dev/null || true
RUN ./mvnw dependency:go-offline -B || mvn dependency:go-offline -B || true

# 复制源代码
COPY src ./src

# 构建应用
RUN chmod +x mvnw 2>/dev/null || true
RUN ./mvnw clean package -DskipTests || mvn clean package -DskipTests

# 暴露端口
EXPOSE 8080

# 设置JVM参数
ENV JAVA_OPTS="-Xmx512m -Xms256m"

# 启动应用
CMD ["java", "-jar", "target/electronic-medical-record-1.0.0.jar"]
