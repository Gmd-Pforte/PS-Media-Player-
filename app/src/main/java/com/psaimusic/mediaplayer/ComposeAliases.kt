package com.psaimusic.mediaplayer

import androidx.compose.foundation.layout.ColumnScope

// Keeps slot APIs readable while the first UI prototype is still contained in MainActivity.
// This can be removed once the UI is split into dedicated component files.
internal typealias Column = ColumnScope
