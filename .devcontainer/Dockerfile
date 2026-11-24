# Android geliştirme ortamı: JDK 17 + Android SDK komut satırı araçları.
# Android SDK araçları (aapt2, adb) Linux'ta yalnızca x86-64 olduğu için imaj
# Apple Silicon'da da linux/amd64 olarak çalışır (OrbStack'te Rosetta ile).
FROM --platform=linux/amd64 eclipse-temurin:17-jdk-jammy

ARG CMDLINE_TOOLS_VERSION=11076708
ARG ANDROID_PLATFORM=35
ARG ANDROID_BUILD_TOOLS=35.0.0
ARG USERNAME=vscode
ARG USER_UID=1000

ENV ANDROID_HOME=/opt/android-sdk \
    ANDROID_SDK_ROOT=/opt/android-sdk \
    GRADLE_USER_HOME=/home/vscode/.gradle
ENV PATH=$PATH:/opt/android-sdk/cmdline-tools/latest/bin:/opt/android-sdk/platform-tools

RUN apt-get update \
    && apt-get install -y --no-install-recommends git unzip curl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

RUN useradd --uid ${USER_UID} --create-home --shell /bin/bash ${USERNAME} \
    && mkdir -p ${ANDROID_HOME} /home/${USERNAME}/.gradle \
    && chown -R ${USERNAME}:${USERNAME} ${ANDROID_HOME} /home/${USERNAME}/.gradle

USER ${USERNAME}

RUN curl -fsSL -o /tmp/cmdline-tools.zip \
        https://dl.google.com/android/repository/commandlinetools-linux-${CMDLINE_TOOLS_VERSION}_latest.zip \
    && unzip -q /tmp/cmdline-tools.zip -d ${ANDROID_HOME}/cmdline-tools \
    && mv ${ANDROID_HOME}/cmdline-tools/cmdline-tools ${ANDROID_HOME}/cmdline-tools/latest \
    && rm /tmp/cmdline-tools.zip \
    && yes | sdkmanager --licenses > /dev/null \
    && sdkmanager "platform-tools" "platforms;android-${ANDROID_PLATFORM}" "build-tools;${ANDROID_BUILD_TOOLS}"

WORKDIR /workspaces/ritma/android
