package com.psaimusic.mediaplayer

import android.content.Context
import android.content.Intent
import android.database.Cursor
import android.media.MediaMetadataRetriever
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
import androidx.compose.foundation.layout.ColumnScope
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
import androidx.compose.material.icons.automirrored.filled.VolumeUp
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.DeleteOutline
import androidx.compose.material.icons.filled.FolderOpen
import androidx.compose.material.icons.filled.Forward10
import androidx.compose.material.icons.filled.MusicNote
import androidx.compose.material.icons.filled.Palette
import androidx.compose.material.icons.filled.Pause
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Repeat
import androidx.compose.material.icons.filled.RepeatOne
import androidx.compose.material.icons.filled.Replay10
import androidx.compose.material.icons.filled.Shuffle
import androidx.compose.material.icons.filled.SkipNext
import androidx.compose.material.icons.filled.SkipPrevious
import androidx.compose.material.icons.filled.VideoLibrary
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ElevatedCard
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Slider
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
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
import androidx.media3.common.MediaMetadata
import androidx.media3.common.Player
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.ui.PlayerView
import kotlinx.coroutines.delay
import org.json.JSONArray
import org.json.JSONObject
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

private enum class MediaKind { NONE, AUDIO, VIDEO, MEDIA }

private data class LocalTrack(
    val uri: Uri,
    val name: String,
    val mime: String,
    val kind: MediaKind,
    val durationHintMs: Long = 0L
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

private object PlaylistStore {
    private const val PREFS = "ps_player_playlist"
    private const val KEY_ITEMS = "items"

    fun load(context: Context): List<LocalTrack> {
        val raw = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .getString(KEY_ITEMS, null) ?: return emptyList()

        return runCatching {
            val array = JSONArray(raw)
            val result = mutableListOf<LocalTrack>()
            for (index in 0 until array.length()) {
                val item = array.optJSONObject(index) ?: continue
                val uriText = item.optString("uri")
                if (uriText.isBlank()) continue
                val kind = runCatching {
                    MediaKind.valueOf(item.optString("kind", MediaKind.MEDIA.name))
                }.getOrDefault(MediaKind.MEDIA)
                result += LocalTrack(
                    uri = Uri.parse(uriText),
                    name = item.optString("name", "Medium"),
                    mime = item.optString("mime", ""),
                    kind = kind,
                    durationHintMs = item.optLong("duration", 0L)
                )
            }
            result
        }.getOrDefault(emptyList())
    }

    fun save(context: Context, tracks: List<LocalTrack>) {
        val array = JSONArray()
        tracks.forEach { track ->
            array.put(
                JSONObject()
                    .put("uri", track.uri.toString())
                    .put("name", track.name)
                    .put("mime", track.mime)
                    .put("kind", track.kind.name)
                    .put("duration", track.durationHintMs)
            )
        }
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .edit()
            .putString(KEY_ITEMS, array.toString())
            .apply()
    }
}

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

@Composable
private fun PlayerApp(
    player: ExoPlayer,
    initialUri: Uri?,
    themeSettings: ThemeSettings,
    onThemeChanged: (ThemeSettings) -> Unit
) {
    val context = LocalContext.current
    var showDesignStudio by remember { mutableStateOf(false) }
    var playlist by remember { mutableStateOf(PlaylistStore.load(context)) }
    var currentIndex by remember { mutableStateOf(if (playlist.isEmpty()) -1 else 0) }
    var isPlaying by remember { mutableStateOf(false) }
    var position by remember { mutableLongStateOf(0L) }
    var duration by remember { mutableLongStateOf(0L) }
    var volume by remember { mutableFloatStateOf(player.volume) }
    var shuffleEnabled by remember { mutableStateOf(player.shuffleModeEnabled) }
    var repeatMode by remember { mutableStateOf(player.repeatMode) }

    fun persist(items: List<LocalTrack>) {
        playlist = items
        PlaylistStore.save(context, items)
    }

    fun appendUris(uris: List<Uri>, playFirstAdded: Boolean = false) {
        if (uris.isEmpty()) return
        uris.forEach { takeReadPermission(context, it) }

        val seen = playlist.map { it.uri.toString() }.toMutableSet()
        val newTracks = uris
            .distinctBy { it.toString() }
            .filter { seen.add(it.toString()) }
            .map { buildTrack(context, it) }

        if (newTracks.isEmpty()) return

        val oldSize = playlist.size
        val wasEmpty = playlist.isEmpty()
        val updated = playlist + newTracks
        persist(updated)

        if (wasEmpty || player.mediaItemCount == 0) {
            player.setMediaItems(updated.map { it.toMediaItem() })
            player.prepare()
        } else {
            player.addMediaItems(newTracks.map { it.toMediaItem() })
        }

        if (playFirstAdded || wasEmpty) {
            val target = if (wasEmpty) 0 else oldSize
            player.seekTo(target, 0L)
            player.play()
        }
    }

    fun removeTrack(index: Int) {
        if (index !in playlist.indices) return
        val updated = playlist.toMutableList().apply { removeAt(index) }
        if (index < player.mediaItemCount) {
            player.removeMediaItem(index)
        }
        persist(updated)
        if (updated.isEmpty()) {
            player.stop()
            player.clearMediaItems()
            currentIndex = -1
            position = 0L
            duration = 0L
        }
    }

    fun clearPlaylist() {
        player.stop()
        player.clearMediaItems()
        persist(emptyList())
        currentIndex = -1
        position = 0L
        duration = 0L
    }

    val filePicker = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.OpenMultipleDocuments()
    ) { uris ->
        appendUris(uris)
    }

    LaunchedEffect(Unit) {
        if (playlist.isNotEmpty() && player.mediaItemCount == 0) {
            player.setMediaItems(playlist.map { it.toMediaItem() })
            player.prepare()
            player.playWhenReady = false
        }
    }

    LaunchedEffect(initialUri) {
        if (initialUri != null) {
            appendUris(listOf(initialUri), playFirstAdded = true)
            val index = playlist.indexOfFirst { it.uri == initialUri }
            if (index >= 0) {
                player.seekTo(index, 0L)
                player.play()
            }
        }
    }

    LaunchedEffect(player) {
        while (true) {
            isPlaying = player.isPlaying
            currentIndex = if (player.mediaItemCount > 0) player.currentMediaItemIndex else -1
            position = player.currentPosition.coerceAtLeast(0L)
            val playerDuration = if (player.duration == C.TIME_UNSET || player.duration < 0) 0L else player.duration
            duration = if (playerDuration > 0) {
                playerDuration
            } else {
                playlist.getOrNull(currentIndex)?.durationHintMs ?: 0L
            }
            volume = player.volume
            shuffleEnabled = player.shuffleModeEnabled
            repeatMode = player.repeatMode
            delay(300)
        }
    }

    val currentTrack = playlist.getOrNull(currentIndex)
    val mediaKind = currentTrack?.kind ?: MediaKind.NONE
    val title = currentTrack?.name ?: "Noch keine Playlist"
    val subtitle = if (currentTrack == null) {
        "Wähle mehrere Audio- oder Videodateien aus"
    } else {
        "Track ${currentIndex + 1} von ${playlist.size} • ${kindLabel(currentTrack.kind)}"
    }

    val pickerTypes = arrayOf(
        "audio/*",
        "video/*",
        "application/ogg",
        "application/x-ogg",
        "application/octet-stream"
    )

    AnimatedRgbBackground(themeSettings) {
        Scaffold(
            containerColor = Color.Transparent,
            topBar = {
                HeaderBar(
                    onOpenFiles = { filePicker.launch(pickerTypes) },
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
                        Icon(
                            Icons.AutoMirrored.Filled.VolumeUp,
                            contentDescription = null,
                            tint = Color.White.copy(alpha = .72f)
                        )
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
                    onAdd = { filePicker.launch(pickerTypes) },
                    onClear = { clearPlaylist() },
                    onDesign = { showDesignStudio = true }
                )

                Spacer(Modifier.height(14.dp))

                PlaylistPanel(
                    tracks = playlist,
                    currentIndex = currentIndex,
                    isPlaying = isPlaying,
                    primary = Color(themeSettings.primary),
                    shuffleEnabled = shuffleEnabled,
                    repeatMode = repeatMode,
                    onTrackClick = { index ->
                        if (index in playlist.indices) {
                            player.seekTo(index, 0L)
                            player.play()
                        }
                    },
                    onRemoveTrack = { removeTrack(it) },
                    onToggleShuffle = {
                        player.shuffleModeEnabled = !player.shuffleModeEnabled
                        shuffleEnabled = player.shuffleModeEnabled
                    },
                    onCycleRepeat = {
                        val next = when (player.repeatMode) {
                            Player.REPEAT_MODE_OFF -> Player.REPEAT_MODE_ALL
                            Player.REPEAT_MODE_ALL -> Player.REPEAT_MODE_ONE
                            else -> Player.REPEAT_MODE_OFF
                        }
                        player.repeatMode = next
                        repeatMode = next
                    }
                )

                Spacer(Modifier.height(28.dp))
                Text(
                    "PS MEDIA PLAYER • LOCAL CORE 0.2",
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
    onOpenFiles: () -> Unit,
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
        IconButton(onClick = onOpenFiles) {
            Icon(Icons.Filled.FolderOpen, "Medien auswählen")
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
            .border(BorderStroke(1.dp, Color.White.copy(alpha = .10f)), shape),
        contentAlignment = Alignment.Center
    ) {
        when (mediaKind) {
            MediaKind.VIDEO -> {
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
            MediaKind.AUDIO, MediaKind.MEDIA -> AudioHero(themeSettings, active = true)
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
                    MediaKind.MEDIA -> "MEDIA"
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
        Text("Bereit für deine Playlist", fontWeight = FontWeight.SemiBold)
        Text("Audio • Video • mehrere Dateien", color = Color.White.copy(alpha = .42f), fontSize = 12.sp)
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
            brush = Brush.radialGradient(listOf(primary.copy(alpha = .22f), Color.Transparent)),
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
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            Text(formatTime(position), color = Color.White.copy(alpha = .48f), fontSize = 11.sp)
            Text(formatTime(duration), color = Color.White.copy(alpha = .48f), fontSize = 11.sp)
        }

        Spacer(Modifier.height(8.dp))

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.Center,
            verticalAlignment = Alignment.CenterVertically
        ) {
            IconButton(
                onClick = { player.seekToPreviousMediaItem() },
                enabled = player.hasPreviousMediaItem()
            ) {
                Icon(Icons.Filled.SkipPrevious, "Vorheriger Track")
            }
            IconButton(onClick = { player.seekBack() }, enabled = player.mediaItemCount > 0) {
                Icon(Icons.Filled.Replay10, "10 Sekunden zurück")
            }
            Spacer(Modifier.width(6.dp))
            Surface(
                modifier = Modifier
                    .size(70.dp)
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
            Spacer(Modifier.width(6.dp))
            IconButton(onClick = { player.seekForward() }, enabled = player.mediaItemCount > 0) {
                Icon(Icons.Filled.Forward10, "10 Sekunden vor")
            }
            IconButton(
                onClick = { player.seekToNextMediaItem() },
                enabled = player.hasNextMediaItem()
            ) {
                Icon(Icons.Filled.SkipNext, "Nächster Track")
            }
        }
    }
}

@Composable
private fun QuickActions(
    onAdd: () -> Unit,
    onClear: () -> Unit,
    onDesign: () -> Unit
) {
    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
        ActionTile(
            modifier = Modifier.weight(1f),
            icon = { Icon(Icons.Filled.Add, null) },
            title = "Medien",
            onClick = onAdd
        )
        ActionTile(
            modifier = Modifier.weight(1f),
            icon = { Icon(Icons.Filled.DeleteOutline, null) },
            title = "Leeren",
            onClick = onClear
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
private fun PlaylistPanel(
    tracks: List<LocalTrack>,
    currentIndex: Int,
    isPlaying: Boolean,
    primary: Color,
    shuffleEnabled: Boolean,
    repeatMode: Int,
    onTrackClick: (Int) -> Unit,
    onRemoveTrack: (Int) -> Unit,
    onToggleShuffle: () -> Unit,
    onCycleRepeat: () -> Unit
) {
    GlassCard {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(Icons.Filled.MusicNote, null, tint = primary)
            Spacer(Modifier.width(10.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text("PLAYLIST", fontWeight = FontWeight.Black, letterSpacing = 1.2.sp)
                Text(
                    if (tracks.size == 1) "1 Medium" else "${tracks.size} Medien",
                    fontSize = 11.sp,
                    color = Color.White.copy(alpha = .45f)
                )
            }
            IconButton(onClick = onToggleShuffle, enabled = tracks.size > 1) {
                Icon(
                    Icons.Filled.Shuffle,
                    "Shuffle",
                    tint = if (shuffleEnabled) primary else Color.White.copy(alpha = .55f)
                )
            }
            IconButton(onClick = onCycleRepeat, enabled = tracks.isNotEmpty()) {
                Icon(
                    if (repeatMode == Player.REPEAT_MODE_ONE) Icons.Filled.RepeatOne else Icons.Filled.Repeat,
                    "Wiederholen",
                    tint = if (repeatMode == Player.REPEAT_MODE_OFF) Color.White.copy(alpha = .55f) else primary
                )
            }
        }

        Spacer(Modifier.height(12.dp))
        HorizontalDivider(color = Color.White.copy(alpha = .07f))
        Spacer(Modifier.height(8.dp))

        if (tracks.isEmpty()) {
            Column(
                modifier = Modifier.fillMaxWidth().padding(vertical = 22.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text("Noch keine Tracks", fontWeight = FontWeight.SemiBold)
                Spacer(Modifier.height(4.dp))
                Text(
                    "Tippe auf Medien und wähle mehrere Dateien aus.",
                    fontSize = 12.sp,
                    color = Color.White.copy(alpha = .45f),
                    textAlign = TextAlign.Center
                )
            }
        } else {
            tracks.forEachIndexed { index, track ->
                TrackRow(
                    track = track,
                    index = index,
                    active = index == currentIndex,
                    playing = index == currentIndex && isPlaying,
                    primary = primary,
                    onClick = { onTrackClick(index) },
                    onRemove = { onRemoveTrack(index) }
                )
                if (index != tracks.lastIndex) {
                    Spacer(Modifier.height(6.dp))
                }
            }
        }
    }
}

@Composable
private fun TrackRow(
    track: LocalTrack,
    index: Int,
    active: Boolean,
    playing: Boolean,
    primary: Color,
    onClick: () -> Unit,
    onRemove: () -> Unit
) {
    val shape = RoundedCornerShape(18.dp)
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(shape)
            .background(if (active) primary.copy(alpha = .11f) else Color.White.copy(alpha = .025f))
            .border(
                width = 1.dp,
                color = if (active) primary.copy(alpha = .48f) else Color.White.copy(alpha = .04f),
                shape = shape
            )
            .clickable(onClick = onClick)
            .padding(start = 12.dp, top = 10.dp, bottom = 10.dp, end = 4.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Surface(
            modifier = Modifier.size(38.dp),
            shape = CircleShape,
            color = if (active) primary.copy(alpha = .20f) else Color.White.copy(alpha = .06f)
        ) {
            Box(contentAlignment = Alignment.Center) {
                if (track.kind == MediaKind.VIDEO) {
                    Icon(Icons.Filled.VideoLibrary, null, modifier = Modifier.size(19.dp), tint = if (active) primary else Color.White.copy(alpha = .65f))
                } else {
                    Icon(Icons.Filled.MusicNote, null, modifier = Modifier.size(19.dp), tint = if (active) primary else Color.White.copy(alpha = .65f))
                }
            }
        }
        Spacer(Modifier.width(11.dp))
        Column(modifier = Modifier.weight(1f)) {
            Text(
                track.name,
                fontWeight = if (active) FontWeight.Bold else FontWeight.Medium,
                fontSize = 13.sp,
                maxLines = 1,
                color = if (active) Color.White else Color.White.copy(alpha = .82f)
            )
            Spacer(Modifier.height(3.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    "${index + 1}. ${kindLabel(track.kind)}",
                    fontSize = 10.sp,
                    color = Color.White.copy(alpha = .42f)
                )
                if (track.durationHintMs > 0) {
                    Text(
                        "  •  ${formatTime(track.durationHintMs)}",
                        fontSize = 10.sp,
                        color = Color.White.copy(alpha = .42f)
                    )
                }
                if (active) {
                    Text(
                        if (playing) "  •  JETZT" else "  •  PAUSE",
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        color = primary
                    )
                }
            }
        }
        IconButton(onClick = onRemove) {
            Icon(
                Icons.Filled.Close,
                contentDescription = "Track entfernen",
                modifier = Modifier.size(18.dp),
                tint = Color.White.copy(alpha = .42f)
            )
        }
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
            modifier = Modifier.fillMaxWidth().padding(vertical = 16.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            icon()
            Spacer(Modifier.height(6.dp))
            Text(title, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
        }
    }
}

@Composable
private fun GlassCard(content: @Composable ColumnScope.() -> Unit) {
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

                Text("RGB Flow", fontSize = 12.sp)
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

private fun buildTrack(context: Context, uri: Uri): LocalTrack {
    val name = displayName(context, uri) ?: uri.lastPathSegment ?: "Medium"
    val mime = runCatching { context.contentResolver.getType(uri) }.getOrNull().orEmpty()
    return LocalTrack(
        uri = uri,
        name = name,
        mime = mime,
        kind = detectMediaKind(name, mime),
        durationHintMs = readDuration(context, uri)
    )
}

private fun LocalTrack.toMediaItem(): MediaItem {
    return MediaItem.Builder()
        .setUri(uri)
        .setMediaId(uri.toString())
        .setMediaMetadata(
            MediaMetadata.Builder()
                .setTitle(name)
                .build()
        )
        .build()
}

private fun detectMediaKind(name: String, mime: String): MediaKind {
    if (mime.startsWith("video/")) return MediaKind.VIDEO
    if (mime.startsWith("audio/")) return MediaKind.AUDIO

    val extension = name.substringAfterLast('.', "").lowercase()
    return when (extension) {
        "mp4", "mkv", "webm", "mov", "m4v", "3gp", "ts", "m2ts" -> MediaKind.VIDEO
        "mp3", "m4a", "aac", "flac", "wav", "ogg", "opus", "wma", "amr" -> MediaKind.AUDIO
        else -> MediaKind.MEDIA
    }
}

private fun kindLabel(kind: MediaKind): String = when (kind) {
    MediaKind.AUDIO -> "Audio"
    MediaKind.VIDEO -> "Video"
    MediaKind.MEDIA -> "Medium"
    MediaKind.NONE -> "Bereit"
}

private fun takeReadPermission(context: Context, uri: Uri) {
    runCatching {
        context.contentResolver.takePersistableUriPermission(
            uri,
            Intent.FLAG_GRANT_READ_URI_PERMISSION
        )
    }
}

private fun readDuration(context: Context, uri: Uri): Long {
    val retriever = MediaMetadataRetriever()
    return try {
        retriever.setDataSource(context, uri)
        retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_DURATION)?.toLongOrNull() ?: 0L
    } catch (_: Exception) {
        0L
    } finally {
        runCatching { retriever.release() }
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
