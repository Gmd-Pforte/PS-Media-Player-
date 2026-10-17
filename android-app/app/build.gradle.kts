plugins {
    id("com.android.application")
}
android {
    namespace = "de.psaimusic.stream"
    compileSdk = 35
    defaultConfig {
        applicationId = "de.psaimusic.stream"
        minSdk = 26
        targetSdk = 28
        versionCode = 1
        versionName = "1.0"
    }
    buildTypes { release { isMinifyEnabled = false } }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}
dependencies {
    implementation("androidx.webkit:webkit:1.12.1")
}
