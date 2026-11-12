import SwiftUI
import Combine
import WatchKit

private let gold = Color(red: 1, green: 0.886, blue: 0.478)
private let grass = Color(red: 0.43, green: 0.72, blue: 0.28)
private let walkGreen = Color(red: 0.235, green: 0.69, blue: 0.353)   // 게임 프로필 .pf-box.walking 점 #3cb05a

struct ContentView: View {
    @EnvironmentObject var model: WatchModel
    @Environment(\.scenePhase) private var scenePhase

    var body: some View {
        NavigationStack {
            List {
                // 2026-11-05 경완: 켜자마자 한 화면 가득 내 캐릭터 + 그 위에 이동 거리. 밑으로 내리면 짝꿍·알
                WalkCard()
                    .frame(height: max(150, WKInterfaceDevice.current().screenBounds.height - 44))
                    .listRowInsets(EdgeInsets())
                    .listRowBackground(Color.clear)
                if let L = model.shown?.allBuds, !L.isEmpty {
                    Section("짝꿍") { ForEach(L.indices, id: \.self) { BuddyRow(buddy: L[$0]) } }
                }
                Section("부화 중인 알") {
                    if let eggs = model.shown?.eggs, !eggs.isEmpty {
                        ForEach(eggs) { EggRow(egg: $0) }
                    } else {
                        Text(model.state == nil ? "아이폰에서 포켓몬 키우기를 한 번 열어 주세요" : "알이 없어요")
                            .font(.footnote).foregroundStyle(.secondary)
                    }
                }
                if let s = model.shown {
                    Section {
                        LabeledContent("총 거리", value: String(format: "%.2fkm", s.total))
                    }
                }
            }
        }
        .onAppear { model.refresh(); model.startLive() }
        .onChange(of: scenePhase) { _, p in
            // 2026-11-12: 손목을 내려 화면이 꺼지면(inactive) 바로 멈춘다. 걷는 중엔 팔을 흔들어 자주 꺼졌다 켜지는데, 꺼진 동안에도
            // 만보기·타이머·걷는 그림이 돌면 워치가 앱을 강제로 닫는다
            if p == .active { model.refresh(); model.startLive() } else { model.stopLive() }
        }
    }
}

struct EggRow: View {
    let egg: EggInfo

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack {
                Text("\(egg.grade) 알").font(.headline)
                Spacer()
                Text(String(format: "%.1f/%gkm", min(egg.km, egg.need), egg.need))
                    .font(.footnote.monospacedDigit()).foregroundStyle(.secondary)
            }
            ReadyBar(value: egg.km, total: egg.need, tint: grass, ready: egg.km >= egg.need)
            Text(egg.km >= egg.need ? "부화 준비 완료! 핸드폰에서 확인하세요" : String(format: "앞으로 %.2fkm", egg.need - egg.km))
                .font(.caption2).foregroundStyle(egg.km >= egg.need ? gold : .secondary)
                .fixedSize(horizontal: false, vertical: true)
        }
        .padding(.vertical, 2)
    }
}

struct BuddyRow: View {
    let buddy: BuddyInfo

    var body: some View {
        HStack(spacing: 10) {
            if let img = buddy.image {
                Image(uiImage: img)
                    .interpolation(.none)
                    .resizable()
                    .scaledToFit()
                    .frame(width: 52, height: 52)
            }
            VStack(alignment: .leading, spacing: 4) {
                Text(buddy.name).font(.headline)
                if buddy.name != buddy.species {
                    Text(buddy.species).font(.caption2).foregroundStyle(.secondary)
                }
                if buddy.need > 0 {
                    ReadyBar(value: buddy.km, total: buddy.need, tint: gold, ready: buddy.ready)
                    Text(buddy.ready ? "진화 준비 완료! 핸드폰에서 확인하세요" : String(format: "진화까지 %.2fkm", buddy.need - buddy.km))
                        .font(.caption2).foregroundStyle(buddy.ready ? gold : .secondary)
                        .fixedSize(horizontal: false, vertical: true)
                } else {
                    Text("더 진화하지 않아요").font(.caption2).foregroundStyle(.secondary)
                }
            }
        }
        .padding(.vertical, 2)
    }
}

// 첫 화면: 게임 프로필의 '이동 거리' + 캐릭터 칸을 한 화면 가득. 걷는 중이면 테두리·숫자가 초록, 점이 깜빡이고 캐릭터가 걷는다
struct WalkCard: View {
    @EnvironmentObject var model: WatchModel
    @Environment(\.scenePhase) private var scenePhase

    var body: some View {
        // 2026-11-12: 화면이 켜져 있을 때만 0.6초마다 깜빡이고, 꺼지면(inactive) 멈춘다 (예전 Timer.publish 는 화면을 다시 그릴 때마다 새로 생겼다)
        TimelineView(.periodic(from: .now, by: scenePhase == .active ? 0.6 : 3600)) { ctx in
            card(now: ctx.date, live: scenePhase == .active)
        }
    }

    @ViewBuilder private func card(now: Date, live: Bool) -> some View {
        let walking = live && now.timeIntervalSince(model.walkAt) < WatchModel.walkLive
        // 2026-11-12 충돌 기록: 워치 SE 1세대(arm64_32)는 Int 가 32비트라 '초 ÷ 0.225' 같은 큰 수를 Int 로 바꾸면 넘쳐서 앱이 죽는다.
        // 그래서 나머지는 Double 로 먼저 구한 뒤 작은 수만 Int 로 바꾼다
        let blink = now.timeIntervalSinceReferenceDate.truncatingRemainder(dividingBy: 1.2) < 0.6
        ZStack(alignment: .top) {
            // 캐릭터 (아래쪽 가운데, 발밑 그림자)
            GeometryReader { g in
                let side = min(g.size.width * 0.8, g.size.height * 0.72)
                VStack(spacing: 0) {
                    Spacer(minLength: 0)
                    ZStack(alignment: .bottom) {
                        Ellipse().fill(Color.black.opacity(0.28))
                            .frame(width: side * 0.42, height: side * 0.09)
                            .offset(y: -side * 0.1)
                        if let fr = model.trFrames {
                            TrainerSprite(frames: fr, walking: walking, side: side)
                        } else {
                            Image(systemName: walking ? "figure.walk" : "figure.stand")
                                .resizable().scaledToFit()
                                .frame(width: side * 0.45, height: side * 0.6)
                                .foregroundStyle(walking ? walkGreen : .secondary)
                                .padding(.bottom, side * 0.12)
                        }
                    }
                    .frame(width: side, height: side)
                }
                .frame(width: g.size.width, height: g.size.height)
            }
            // 위: 이동 거리
            VStack(spacing: 0) {
                HStack(spacing: 5) {
                    Rectangle().fill(walkGreen).frame(width: 7, height: 7)
                        .opacity(walking && blink ? 1 : 0)
                    Text(walking ? "걷는 중" : "이동 거리").font(.caption2).foregroundStyle(walking ? walkGreen : .secondary)
                    Rectangle().fill(Color.clear).frame(width: 7, height: 7)
                }
                HStack(alignment: .firstTextBaseline, spacing: 3) {
                    Text(String(format: "%.2f", model.todayKm))
                        .font(.system(size: 34, weight: .bold, design: .rounded)).monospacedDigit()
                        .foregroundStyle(walking ? walkGreen : .primary)
                    Text("km").font(.footnote).foregroundStyle(.secondary)
                }
            }
            .padding(.top, 8)
        }
        .background(
            RoundedRectangle(cornerRadius: 14)
                .fill(LinearGradient(colors: [Color.white.opacity(0.06), grass.opacity(0.28)], startPoint: .top, endPoint: .bottom))
                .overlay(RoundedRectangle(cornerRadius: 14).strokeBorder(walkGreen, lineWidth: 2).opacity(walking ? 1 : 0))
        )
    }
}

// 2026-11-05 경완: 아이폰 프로필처럼 걸을 땐 내 캐릭터가 걷고, 안 걸을 땐 서 있는다.
// 게임 trWalk(0.9초): 선 모습 → 걸음 → 선 모습 → 걸음(좌우 뒤집기)
struct TrainerSprite: View {
    let frames: (stand: CGImage, step: CGImage)
    let walking: Bool
    var side: CGFloat = 52

    var body: some View {
        TimelineView(.periodic(from: .now, by: walking ? 0.225 : 60)) { ctx in
            // 걷는 그림 칸 번호: 0.9초(0.225×4) 나머지로 0~3 (예전 Int(초/0.225) 는 32비트 워치에서 넘쳐 '걷는 중에 켜면 꺼짐' 원인)
            let i = walking ? min(3, Int(ctx.date.timeIntervalSinceReferenceDate.truncatingRemainder(dividingBy: 0.9) / 0.225)) : 0
            Image(decorative: i % 2 == 1 ? frames.step : frames.stand, scale: 1)
                .interpolation(.none)
                .resizable()
                .frame(width: side, height: side)
                .scaleEffect(x: i == 3 ? -1 : 1, y: 1)
        }
        .frame(width: side, height: side)
    }
}

// 2026-11-05 경완: 진화·부화 준비가 끝나면 게이지 테두리가 은은하게 빛난다 (워치에선 진화·부화 못 함 → 문구로 아이폰 안내)
struct ReadyBar: View {
    let value: Double
    let total: Double
    let tint: Color
    let ready: Bool
    @State private var glow = false

    var body: some View {
        GeometryReader { g in
            let p = total > 0 ? min(max(value / total, 0), 1) : 0
            ZStack(alignment: .leading) {
                Capsule().fill(Color.white.opacity(0.15))
                Capsule().fill(tint).frame(width: g.size.width * p)
            }
            .overlay(
                Capsule().strokeBorder(gold, lineWidth: 1.5)
                    .shadow(color: gold.opacity(0.9), radius: glow ? 4 : 1)
                    .opacity(ready ? (glow ? 0.95 : 0.35) : 0)
            )
        }
        .frame(height: 7)
        .onAppear { startGlow() }
        .onChange(of: ready) { _, _ in startGlow() }
    }

    private func startGlow() {
        guard ready else { glow = false; return }
        withAnimation(.easeInOut(duration: 1.4).repeatForever(autoreverses: true)) { glow = true }
    }
}
