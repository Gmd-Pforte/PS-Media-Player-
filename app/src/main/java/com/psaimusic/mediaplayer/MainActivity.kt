package com.psaimusic.mediaplayer

import android.content.Context
import android.content.Intent
import android.database.Cursor
import android.net.Uri
import android.os.Bundle
import android.provider.OpenableColumns
import androidx.activity.ComponentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Equalizer
import androidx.compose.material.icons.filled.FolderOpen
import androidx.compose.material.icons.filled.Forward10
import androidx.compose.material.icons.filled.Link
import androidx.compose.material.icons.filled.MusicNote
import androidx.compose.material.icons.filled.Palette
import androidx.compose.material.icons.filled.Pause
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Replay10
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.VideoFile
import androidx.compose.material.icons.filled.VolumeUp
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ElevatedCard
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Slider
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.compose.ui.window.Dialog
import androidx.media3.common.C
import androidx.media3.common.MediaItem
import androidx.media3.common.Player
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.ui.PlayerView
import kotlinx.coroutines.delay
import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.sin

class MainActivity : ComponentActivity() {
    private lateinit var player: ExoPlayer

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        player = ExoPlayer.Builder(this).build().apply {
            repeatMode = Player.REPEAT_MODE_OFF
        }

        val incomingUri = intent?.data

        setContent {
            val context = LocalContext.current
            var themeSettings by remember { mutableStateOf(ThemeStore.load(context)) }

            PSMediaPlayerTheme(themeSettings) {
                PlayerApp(
                    player = player,
                    initialUri = incomingUri,
                    themeSettings = themeSettings,
                    onThemeChanged = {
                        themeSettings = it
                        ThemeStore.save(context, it)
                    }
                )
            }
        }
    }

    override fun onDestroy() {
        player.release()
        super.onDestroy()
    }
}

data class ThemeSettings(
    val primary: Int = 0xFF32D7FF.toInt(),
    val secondary: Int = 0xFF9D4DFF.toInt(),
    val glow: Int = 0xFFFF3CAC.toInt(),
    val glowStrength: Float = 0.72f,
    val flowSpeed: Int = 9000,
    val motionEnabled: Boolean = true
)

private object ThemeStore {
    private const val PREFS = "ps_player_design"

    fun load(context: Context): ThemeSettings {
        val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        return ThemeSettings(
            primary = prefs.getInt("primary", 0xFF32D7FF.toInt()),
            secondary = prefs.getInt("secondary", 0xFF9D4DFF.toInt()),
            glow = prefs.getInt("glow", 0xFFFF3CAC.toInt()),
            glowStrength = prefs.getFloat("glowStrength", 0.72f),
            flowSpeed = prefs.getInt("flowSpeed", 9000),
            motionEnabled = prefs.getBoolean("motionEnabled", true)
        )
    }

    fun save(context: Context, value: ThemeSettings) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .edit()
            .putInt("primary", value.primary)
            .putInt("secondary", value.secondary)
            .putInt("glow", value.glow)
            .putFloat("glowStrength", value.glowStrength)
            .putInt("flowSpeed", value.flowSpeed)
            .putBoolean("motionEnabled", value.motionEnabled)
            .apply()
    }
}

private enum class MediaKind { NONE, AUDIO, VIDEO, STREAM }

@Composable
private fun PSMediaPlayerTheme(settings: ThemeSettings, content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = darkColorScheme(
            primary = Color(settings.primary),
            secondary = Color(settings.secondary),
            tertiary = Color(settings.glow),
            background = Color(0xFF05060A),
            surface = Color(0xFF0C0E15),
            onBackground = Color(0xFFF6F7FB),
            onSurface = Color(0xFFF6F7FB)
        ),
        content = content
    )
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun PlayerApp(
    player: ExoPlayer,
    initialUri: Uri?,
    themeSettings: ThemeSettings,
    onThemeChanged: (ThemeSettings) -> Unit
) {
    val context = LocalContext.current
    var showDesignStudio by remember { mutableStateOf(false) }
    var showStreamDialog by remember { mutableStateOf(false) }
    var title by remember { mutableStateOf("Noch nichts geladen") }
    var subtitle by remember { mutableStateOf("Öffne Musik, Video oder einen Stream") }
    var mediaKind by remember { mutableStateOf(MediaKind.NONE) }
    var isPlaying by remember { mutableStateOf(false) }
    var position by remember { mutableLongStateOf(0L) }
    var duration by remember { mutableLongStateOf(0L) }
    var volume by remember { mutableFloatStateOf(player.volume) }

    fun loadUri(uri: Uri, sourceLabel: String? = null) {
        val mime = context.contentResolver.getType(uri).orEmpty()
        mediaKind = when {
            mime.startsWith("video/") -> MediaKind.VIDEO
            mime.startsWith("audio/") -> MediaKind.AUDIO
            uri.scheme == "http" || uri.scheme == "https" || uri.scheme == "rtsp" -> MediaKind.STREAM
            else -> MediaKind.STREAM
        }
        title = sourceLabel ?: displayName(context, uri) ?: uri.lastPathSegment ?: "Medium"
        subtitle = when (mediaKind) {
            MediaKind.AUDIO -> mime.ifBlank { "Audio" }
            MediaKind.VIDEO -> mime.ifBlank { "Video" }
            MediaKind.STREAM -> "Netzwerk / Stream"
            MediaKind.NONE -> ""
        }
        player.setMediaItem(MediaItem.fromUri(uri))
        player.prepare()
        player.playWhenReady = true
    }

    val filePicker = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.OpenDocument()
    ) { uri ->
        if (uri != null) {
            try {
                context.contentResolver.takePersistableUriPermission(
                    uri,
                    Intent.FLAG_GRANT_READ_URI_PERMISSION
                )
            } catch (_: Exception) {
            }
            loadUri(uri)
        }
    }

    LaunchedEffect(initialUri) {
        if (initialUri != null) loadUri(initialUri)
    }

    LaunchedEffect(player) {
        while (true) {
            isPlaying = player.isPlaying
            position = player.currentPosition.coerceAtLeast(0L)
            duration = if (player.duration == C.TIME_UNSET || player.duration < 0) 0L else player.duration
            volume = player.volume
            delay(350)
        }
    }

    AnimatedRgbBackground(themeSettings) {
        Scaffold(
            containerColor = Color.Transparent,
            topBar = {
                HeaderBar(
                    onOpenFile = { filePicker.launch(arrayOf("audio/*", "video/*", "application/ogg", "application/octet-stream")) },
                    onOpenStream = { showStreamDialog = true },
                    onDesign = { showDesignStudio = true }
                )
            }
        ) { padding ->
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding)
                    .padding(horizontal = 18.dp)
                    .navigationBarsPadding()
                    .verticalScroll(rememberScrollState()),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Spacer(Modifier.height(10.dp))

                PlayerStage(
                    player = player,
                    mediaKind = mediaKind,
                    themeSettings = themeSettings
                )

                Spacer(Modifier.height(20.dp))

                Text(
                    text = title,
                    fontSize = 22.sp,
                    fontWeight = FontWeight.Bold,
                    textAlign = TextAlign.Center,
                    maxLines = 2
                )
                Spacer(Modifier.height(5.dp))
                Text(
                    text = subtitle,
                    color = Color.White.copy(alpha = 0.58f),
                    fontSize = 13.sp,
                    textAlign = TextAlign.Center
                )

                Spacer(Modifier.height(22.dp))

                TransportCard(
                    player = player,
                    isPlaying = isPlaying,
                    position = position,
                    duration = duration,
                    primary = Color(themeSettings.primary)
                )

                Spacer(Modifier.height(14.dp))

                GlassCard {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(Icons.Filled.VolumeUp, contentDescription = null, tint = Color.White.copy(alpha = .72f))
                        Spacer(Modifier.width(12.dp))
                        Slider(
                            value = volume,
                            onValueChange = {
                                volume = it
                                player.volume = it
                            },
                            modifier = Modifier.weight(1f)
                        )
                    }
                }

                Spacer(Modifier.height(14.dp))

                QuickActions(
                    onOpenFile = { filePicker.launch(arrayOf("audio/*", "video/*", "application/ogg", "application/octet-stream")) },
                    onStream = { showStreamDialog = true },
                    onDesign = { showDesignStudio = true }
                )

                Spacer(Modifier.height(28.dp))
                Text(
                    "PS MEDIA PLAYER • CORE 0.1",
                    color = Color.White.copy(alpha = .28f),
                    letterSpacing = 2.sp,
                    fontSize = 10.sp
                )
                Spacer(Modifier.height(24.dp))
            }
        }
    }

    if (showDesignStudio) {
        DesignStudioDialog(
            current = themeSettings,
            onDismiss = { showDesignStudio = false },
            onApply = {
                onThemeChanged(it)
                showDesignStudio = false
            }
        )
    }

    if (showStreamDialog) {
        StreamDialog(
            onDismiss = { showStreamDialog = false },
            onOpen = { value ->
                runCatching { Uri.parse(value.trim()) }
                    .onSuccess { uri ->
                        loadUri(uri, value.trim())
                        showStreamDialog = false
                    }
            }
        )
    }
}

@Composable
private fun AnimatedRgbBackground(settings: ThemeSettings, content: @Composable () -> Unit) {
    val transition = rememberInfiniteTransition(label = "rgb-flow")
    val phase by transition.animateFloat(
        initialValue = 0f,
        targetValue = 360f,
        animationSpec = infiniteRepeatable(
            animation = tween(
                durationMillis = if (settings.motionEnabled) settings.flowSpeed.coerceIn(2500, 22000) else 60000,
                easing = LinearEasing
            ),
            repeatMode = RepeatMode.Restart
        ),
        label = "rgb-phase"
    )

    val primary = Color(settings.primary)
    val secondary = Color(settings.secondary)
    val glow = Color(settings.glow)

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF040509))
            .drawBehind {
                val angle = if (settings.motionEnabled) phase else 35f
                val rad = angle / 180f * PI.toFloat()
                val radius = size.maxDimension * 0.75f
                val center = Offset(size.width / 2f, size.height / 2f)
                val delta = Offset(cos(rad) * radius, sin(rad) * radius)
                drawRect(
                    brush = Brush.linearGradient(
                        colors = listOf(
                            primary.copy(alpha = .23f),
                            glow.copy(alpha = .13f * settings.glowStrength),
                            secondary.copy(alpha = .22f),
                            Color(0xFF05060A)
                        ),
                        start = center - delta,
                        end = center + delta
                    )
                )
            }
    ) {
        Canvas(Modifier.fillMaxSize()) {
            drawCircle(
                brush = Brush.radialGradient(
                    colors = listOf(glow.copy(alpha = .14f * settings.glowStrength), Color.Transparent),
                    center = Offset(size.width * .85f, size.height * .16f),
                    radius = size.width * .72f
                ),
                radius = size.width * .72f,
                center = Offset(size.width * .85f, size.height * .16f)
            )
        }
        content()
    }
}

@Composable
private fun HeaderBar(
    onOpenFile: () -> Unit,
    onOpenStream: () -> Unit,
    onDesign: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .statusBarsPadding()
            .padding(horizontal = 14.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Column(modifier = Modifier.weight(1f)) {
            Text("PS", fontSize = 11.sp, letterSpacing = 3.sp, color = MaterialTheme.colorScheme.primary)
            Text("MEDIA PLAYER", fontSize = 18.sp, fontWeight = FontWeight.Black, letterSpacing = 1.sp)
        }
        IconButton(onClick = onOpenFile) {
            Icon(Icons.Filled.FolderOpen, "Datei öffnen")
        }
        IconButton(onClick = onOpenStream) {
            Icon(Icons.Filled.Link, "Stream öffnen")
        }
        IconButton(onClick = onDesign) {
            Icon(Icons.Filled.Palette, "Design Studio", tint = MaterialTheme.colorScheme.primary)
        }
    }
}

@Composable
private fun PlayerStage(
    player: ExoPlayer,
    mediaKind: MediaKind,
    themeSettings: ThemeSettings
) {
    val shape = RoundedCornerShape(30.dp)
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .aspectRatio(1.12f)
            .clip(shape)
            .background(Color.Black.copy(alpha = .42f))
            .border(
                BorderStroke(1.dp, Color.White.copy(alpha = .10f)),
                shape
            ),
        contentAlignment = Alignment.Center
    ) {
        when (mediaKind) {
            MediaKind.VIDEO, MediaKind.STREAM -> {
                AndroidView(
                    factory = { context ->
                        PlayerView(context).apply {
                            useController = false
                            this.player = player
                            setShowBuffering(PlayerView.SHOW_BUFFERING_WHEN_PLAYING)
                        }
                    },
                    update = { it.player = player },
                    modifier = Modifier.fillMaxSize()
                )
            }
            MediaKind.AUDIO -> AudioHero(themeSettings, active = true)
            MediaKind.NONE -> EmptyStage(themeSettings)
        }

        Box(
            modifier = Modifier
                .align(Alignment.TopEnd)
                .padding(14.dp)
                .clip(RoundedCornerShape(100.dp))
                .background(Color.Black.copy(alpha = .45f))
                .padding(horizontal = 10.dp, vertical = 6.dp)
        ) {
            Text(
                when (mediaKind) {
                    MediaKind.AUDIO -> "AUDIO"
                    MediaKind.VIDEO -> "VIDEO"
                    MediaKind.STREAM -> "STREAM"
                    MediaKind.NONE -> "READY"
                },
                fontSize = 10.sp,
                letterSpacing = 1.5.sp,
                fontWeight = FontWeight.Bold,
                color = Color.White.copy(alpha = .75f)
            )
        }
    }
}

@Composable
private fun EmptyStage(settings: ThemeSettings) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Surface(
            modifier = Modifier.size(110.dp),
            shape = CircleShape,
            color = Color(settings.primary).copy(alpha = .10f),
            border = BorderStroke(1.dp, Color(settings.primary).copy(alpha = .45f))
        ) {
            Box(contentAlignment = Alignment.Center) {
                Icon(
                    Icons.Filled.MusicNote,
                    contentDescription = null,
                    modifier = Modifier.size(48.dp),
                    tint = Color(settings.primary)
                )
            }
        }
        Spacer(Modifier.height(18.dp))
        Text("Bereit für dein Medium", fontWeight = FontWeight.SemiBold)
        Text("Audio • Video • Stream", color = Color.White.copy(alpha = .42f), fontSize = 12.sp)
    }
}

@Composable
private fun AudioHero(settings: ThemeSettings, active: Boolean) {
    val transition = rememberInfiniteTransition(label = "audio-hero")
    val pulse by transition.animateFloat(
        initialValue = .92f,
        targetValue = 1.08f,
        animationSpec = infiniteRepeatable(tween(1600), RepeatMode.Reverse),
        label = "audio-pulse"
    )
    val primary = Color(settings.primary)
    val secondary = Color(settings.secondary)

    Canvas(Modifier.size(240.dp)) {
        val r = size.minDimension / 2f
        drawCircle(
            brush = Brush.radialGradient(
                listOf(primary.copy(alpha = .22f), Color.Transparent)
            ),
            radius = r * 1.05f
        )
        drawCircle(
            brush = Brush.sweepGradient(listOf(primary, secondary, primary)),
            radius = r * .78f * if (active) pulse else 1f,
            style = Stroke(width = 8f)
        )
        drawCircle(Color(0xFF090B10), radius = r * .67f)
        drawCircle(primary.copy(alpha = .16f), radius = r * .22f)

        val bars = 26
        repeat(bars) { index ->
            val x = size.width * .22f + index * (size.width * .56f / (bars - 1))
            val wave = (sin(index * .72f + pulse * 4f) + 1f) / 2f
            val h = 16f + wave * 48f
            drawLine(
                color = if (index % 2 == 0) primary else secondary,
                start = Offset(x, size.height / 2f - h / 2f),
                end = Offset(x, size.height / 2f + h / 2f),
                strokeWidth = 5f,
                cap = StrokeCap.Round
            )
        }
    }
}

@Composable
private fun TransportCard(
    player: ExoPlayer,
    isPlaying: Boolean,
    position: Long,
    duration: Long,
    primary: Color
) {
    GlassCard {
        val max = duration.coerceAtLeast(1L).toFloat()
        Slider(
            value = position.coerceIn(0L, duration.coerceAtLeast(0L)).toFloat(),
            onValueChange = { player.seekTo(it.toLong()) },
            valueRange = 0f..max,
            enabled = duration > 0,
            modifier = Modifier.fillMaxWidth()
        )
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Text(formatTime(position), color = Color.White.copy(alpha = .48f), fontSize = 11.sp)
            Text(formatTime(duration), color = Color.White.copy(alpha = .48f), fontSize = 11.sp)
        }

        Spacer(Modifier.height(8.dp))

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.Center,
            verticalAlignment = Alignment.CenterVertically
        ) {
            IconButton(onClick = { player.seekBack() }, enabled = player.mediaItemCount > 0) {
                Icon(Icons.Filled.Replay10, "10 Sekunden zurück")
            }
            Spacer(Modifier.width(18.dp))
            Surface(
                modifier = Modifier
                    .size(72.dp)
                    .clickable(enabled = player.mediaItemCount > 0) {
                        if (player.isPlaying) player.pause() else player.play()
                    },
                color = primary,
                shape = CircleShape,
                shadowElevation = 12.dp
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(
                        if (isPlaying) Icons.Filled.Pause else Icons.Filled.PlayArrow,
                        contentDescription = if (isPlaying) "Pause" else "Play",
                        tint = Color.Black,
                        modifier = Modifier.size(38.dp)
                    )
                }
            }
            Spacer(Modifier.width(18.dp))
            IconButton(onClick = { player.seekForward() }, enabled = player.mediaItemCount > 0) {
                Icon(Icons.Filled.Forward10, "10 Sekunden vor")
            }
        }
    }
}

@Composable
private fun QuickActions(
    onOpenFile: () -> Unit,
    onStream: () -> Unit,
    onDesign: () -> Unit
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        ActionTile(
            modifier = Modifier.weight(1f),
            icon = { Icon(Icons.Filled.FolderOpen, null) },
            title = "Datei",
            onClick = onOpenFile
        )
        ActionTile(
            modifier = Modifier.weight(1f),
            icon = { Icon(Icons.Filled.Link, null) },
            title = "Stream",
            onClick = onStream
        )
        ActionTile(
            modifier = Modifier.weight(1f),
            icon = { Icon(Icons.Filled.Palette, null) },
            title = "Design",
            onClick = onDesign
        )
    }
}

@Composable
private fun ActionTile(
    modifier: Modifier,
    icon: @Composable () -> Unit,
    title: String,
    onClick: () -> Unit
) {
    ElevatedCard(
        modifier = modifier.clickable(onClick = onClick),
        colors = CardDefaults.elevatedCardColors(containerColor = Color(0xB30B0E14)),
        shape = RoundedCornerShape(20.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = 16.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            icon()
            Spacer(Modifier.height(6.dp))
            Text(title, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
        }
    }
}

@Composable
private fun GlassCard(content: @Composable Column.() -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(24.dp))
            .background(Color(0xB30A0C12))
            .border(1.dp, Color.White.copy(alpha = .08f), RoundedCornerShape(24.dp))
            .padding(16.dp),
        content = content
    )
}

@Composable
private fun StreamDialog(onDismiss: () -> Unit, onOpen: (String) -> Unit) {
    var value by remember { mutableStateOf("") }
    AlertDialog(
        onDismissRequest = onDismiss,
        icon = { Icon(Icons.Filled.Link, null) },
        title = { Text("Stream öffnen") },
        text = {
            Column {
                Text(
                    "Direkte Medien-URL einfügen, z. B. HLS (.m3u8), DASH (.mpd), RTSP oder normale HTTP/HTTPS-Mediendateien.",
                    color = Color.White.copy(alpha = .65f),
                    fontSize = 13.sp
                )
                Spacer(Modifier.height(12.dp))
                OutlinedTextField(
                    value = value,
                    onValueChange = { value = it },
                    label = { Text("Medien-URL") },
                    singleLine = true
                )
            }
        },
        confirmButton = {
            Button(onClick = { if (value.isNotBlank()) onOpen(value) }, enabled = value.isNotBlank()) {
                Text("Öffnen")
            }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Abbrechen") } }
    )
}

@Composable
private fun DesignStudioDialog(
    current: ThemeSettings,
    onDismiss: () -> Unit,
    onApply: (ThemeSettings) -> Unit
) {
    var draft by remember(current) { mutableStateOf(current) }

    Dialog(onDismissRequest = onDismiss) {
        Surface(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(28.dp),
            color = Color(0xFF0A0D13),
            border = BorderStroke(1.dp, Color.White.copy(alpha = .10f))
        ) {
            Column(
                modifier = Modifier
                    .padding(18.dp)
                    .verticalScroll(rememberScrollState())
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Filled.Palette, null, tint = Color(draft.primary))
                    Spacer(Modifier.width(10.dp))
                    Column(modifier = Modifier.weight(1f)) {
                        Text("DESIGN STUDIO", fontWeight = FontWeight.Black, letterSpacing = 1.2.sp)
                        Text("Live RGB Theme", fontSize = 11.sp, color = Color.White.copy(alpha = .45f))
                    }
                    IconButton(onClick = onDismiss) { Icon(Icons.Filled.Close, "Schließen") }
                }

                Spacer(Modifier.height(14.dp))
                PreviewStrip(draft)
                Spacer(Modifier.height(18.dp))

                Text("PRESETS", fontSize = 11.sp, letterSpacing = 1.4.sp, color = Color.White.copy(alpha = .5f))
                Spacer(Modifier.height(9.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    PresetButton("Cyber", 0xFF32D7FF.toInt(), 0xFF9D4DFF.toInt(), 0xFFFF3CAC.toInt()) {
                        draft = draft.copy(primary = it.first, secondary = it.second, glow = it.third)
                    }
                    PresetButton("Fire", 0xFFFF6B35.toInt(), 0xFFFF1744.toInt(), 0xFFFFC107.toInt()) {
                        draft = draft.copy(primary = it.first, secondary = it.second, glow = it.third)
                    }
                    PresetButton("Ice", 0xFF8BE9FD.toInt(), 0xFF5B8CFF.toInt(), 0xFFFFFFFF.toInt()) {
                        draft = draft.copy(primary = it.first, secondary = it.second, glow = it.third)
                    }
                }

                Spacer(Modifier.height(18.dp))
                RgbEditor("HAUPTFARBE", draft.primary) { draft = draft.copy(primary = it) }
                Spacer(Modifier.height(14.dp))
                RgbEditor("ZWEITFARBE", draft.secondary) { draft = draft.copy(secondary = it) }
                Spacer(Modifier.height(14.dp))
                RgbEditor("GLOW", draft.glow) { draft = draft.copy(glow = it) }

                Spacer(Modifier.height(18.dp))
                Text("Glow-Stärke ${(draft.glowStrength * 100).toInt()}%", fontSize = 12.sp)
                Slider(
                    value = draft.glowStrength,
                    onValueChange = { draft = draft.copy(glowStrength = it) },
                    valueRange = 0.1f..1f
                )

                Text("RGB Flow ${(23000 - draft.flowSpeed) / 1000f}x", fontSize = 12.sp)
                Slider(
                    value = draft.flowSpeed.toFloat(),
                    onValueChange = { draft = draft.copy(flowSpeed = it.toInt()) },
                    valueRange = 2500f..22000f
                )

                Row(verticalAlignment = Alignment.CenterVertically) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text("Bewegte Effekte", fontWeight = FontWeight.SemiBold)
                        Text("RGB-Verlauf animieren", fontSize = 11.sp, color = Color.White.copy(alpha = .45f))
                    }
                    Switch(
                        checked = draft.motionEnabled,
                        onCheckedChange = { draft = draft.copy(motionEnabled = it) }
                    )
                }

                Spacer(Modifier.height(18.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    OutlinedButton(
                        onClick = { draft = ThemeSettings() },
                        modifier = Modifier.weight(1f)
                    ) {
                        Icon(Icons.Filled.Refresh, null)
                        Spacer(Modifier.width(6.dp))
                        Text("Reset")
                    }
                    Button(
                        onClick = { onApply(draft) },
                        modifier = Modifier.weight(1f),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = Color(draft.primary),
                            contentColor = Color.Black
                        )
                    ) {
                        Text("Übernehmen", fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    }
}

@Composable
private fun PreviewStrip(settings: ThemeSettings) {
    val shape = RoundedCornerShape(18.dp)
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(76.dp)
            .clip(shape)
            .background(
                Brush.horizontalGradient(
                    listOf(Color(settings.primary), Color(settings.glow), Color(settings.secondary))
                )
            )
            .padding(1.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxSize()
                .clip(shape)
                .background(Color(0xD9080A0F))
                .padding(horizontal = 16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Surface(shape = CircleShape, color = Color(settings.primary), modifier = Modifier.size(44.dp)) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(Icons.Filled.PlayArrow, null, tint = Color.Black)
                }
            }
            Spacer(Modifier.width(12.dp))
            Column {
                Text("Dein Player. Dein Look.", fontWeight = FontWeight.Bold)
                Text("RGB Vorschau", fontSize = 11.sp, color = Color(settings.secondary))
            }
        }
    }
}

@Composable
private fun PresetButton(
    name: String,
    a: Int,
    b: Int,
    c: Int,
    onClick: (Triple<Int, Int, Int>) -> Unit
) {
    Column(
        modifier = Modifier
            .clip(RoundedCornerShape(14.dp))
            .clickable { onClick(Triple(a, b, c)) }
            .background(Color.White.copy(alpha = .045f))
            .padding(9.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Canvas(Modifier.size(34.dp)) {
            drawCircle(Brush.sweepGradient(listOf(Color(a), Color(b), Color(c), Color(a))))
        }
        Spacer(Modifier.height(5.dp))
        Text(name, fontSize = 10.sp)
    }
}

@Composable
private fun RgbEditor(label: String, colorInt: Int, onColorChanged: (Int) -> Unit) {
    var red by remember(colorInt) { mutableFloatStateOf(((colorInt shr 16) and 0xFF).toFloat()) }
    var green by remember(colorInt) { mutableFloatStateOf(((colorInt shr 8) and 0xFF).toFloat()) }
    var blue by remember(colorInt) { mutableFloatStateOf((colorInt and 0xFF).toFloat()) }

    fun push() {
        val packed = (0xFF shl 24) or (red.toInt() shl 16) or (green.toInt() shl 8) or blue.toInt()
        onColorChanged(packed)
    }

    Column {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(
                Modifier
                    .size(22.dp)
                    .clip(CircleShape)
                    .background(Color(colorInt))
                    .border(1.dp, Color.White.copy(alpha = .25f), CircleShape)
            )
            Spacer(Modifier.width(8.dp))
            Text(label, fontSize = 11.sp, letterSpacing = 1.1.sp, color = Color.White.copy(alpha = .65f))
        }
        ChannelSlider("R", red, Color.Red) { red = it; push() }
        ChannelSlider("G", green, Color.Green) { green = it; push() }
        ChannelSlider("B", blue, Color.Blue) { blue = it; push() }
    }
}

@Composable
private fun ChannelSlider(label: String, value: Float, tint: Color, onChange: (Float) -> Unit) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Text(label, color = tint, fontWeight = FontWeight.Bold, modifier = Modifier.width(18.dp), fontSize = 11.sp)
        Slider(value = value, onValueChange = onChange, valueRange = 0f..255f, modifier = Modifier.weight(1f))
        Text(value.toInt().toString(), modifier = Modifier.width(34.dp), textAlign = TextAlign.End, fontSize = 10.sp)
    }
}

private fun displayName(context: Context, uri: Uri): String? {
    if (uri.scheme != "content") return uri.lastPathSegment
    var cursor: Cursor? = null
    return try {
        cursor = context.contentResolver.query(uri, arrayOf(OpenableColumns.DISPLAY_NAME), null, null, null)
        if (cursor != null && cursor.moveToFirst()) {
            val index = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
            if (index >= 0) cursor.getString(index) else null
        } else null
    } catch (_: Exception) {
        null
    } finally {
        cursor?.close()
    }
}

private fun formatTime(ms: Long): String {
    if (ms <= 0) return "0:00"
    val totalSeconds = ms / 1000
    val hours = totalSeconds / 3600
    val minutes = (totalSeconds % 3600) / 60
    val seconds = totalSeconds % 60
    return if (hours > 0) "%d:%02d:%02d".format(hours, minutes, seconds)
    else "%d:%02d".format(minutes, seconds)
}
