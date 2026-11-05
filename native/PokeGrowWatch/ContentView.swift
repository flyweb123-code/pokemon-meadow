import SwiftUI
import Combine

private let gold = Color(red: 1, green: 0.886, blue: 0.478)
private let grass = Color(red: 0.43, green: 0.72, blue: 0.28)
private let walkGreen = Color(red: 0.235, green: 0.69, blue: 0.353)   // 게임 프로필 .pf-box.walking 점 #3cb05a

struct ContentView: View {
    @EnvironmentObject var model: WatchModel
    @Environment(\.scenePhase) private var scenePhase

    var body: some View {
        NavigationStack {
            List {
                // 2026-11-05 경완: 런닝하기 버튼 대신 게임 프로필의 '이동 거리' (걸으면 초록으로 켜짐)
                Section { WalkCard() }
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
            .navigationTitle("포켓몬 키우기")
        }
        .onAppear { model.refresh(); model.startLive() }
        .onChange(of: scenePhase) { _, p in
            if p == .active { model.refresh(); model.startLive() } else if p == .background { model.stopLive() }
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
            ProgressView(value: min(egg.km, egg.need), total: egg.need).tint(grass)
            Text(egg.km >= egg.need ? "아이폰에서 열면 부화해요!" : String(format: "앞으로 %.2fkm", egg.need - egg.km))
                .font(.caption2).foregroundStyle(egg.km >= egg.need ? gold : .secondary)
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
                    ProgressView(value: min(buddy.km, buddy.need), total: buddy.need).tint(gold)
                    Text(buddy.ready ? "진화 준비 완료!" : String(format: "진화까지 %.2fkm", buddy.need - buddy.km))
                        .font(.caption2).foregroundStyle(buddy.ready ? gold : .secondary)
                } else {
                    Text("더 진화하지 않아요").font(.caption2).foregroundStyle(.secondary)
                }
            }
        }
        .padding(.vertical, 2)
    }
}

// 게임 프로필의 '이동 거리' 칸과 같은 모양: 걷는 중이면 테두리·숫자가 초록으로, 왼쪽 위 점이 깜빡인다
struct WalkCard: View {
    @EnvironmentObject var model: WatchModel
    @State private var now = Date()
    private let tick = Timer.publish(every: 0.6, on: .main, in: .common).autoconnect()

    var body: some View {
        let walking = now.timeIntervalSince(model.walkAt) < WatchModel.walkLive
        let blink = Int(now.timeIntervalSinceReferenceDate / 0.6) % 2 == 0
        HStack(alignment: .center, spacing: 4) {
            VStack(alignment: .leading, spacing: 2) {
                HStack(spacing: 5) {
                    Rectangle().fill(walkGreen).frame(width: 7, height: 7)
                        .opacity(walking && blink ? 1 : 0)
                    Text(walking ? "걷는 중" : "이동 거리").font(.caption2).foregroundStyle(walking ? walkGreen : .secondary)
                }
                HStack(alignment: .firstTextBaseline, spacing: 3) {
                    Text(String(format: "%.2f", model.todayKm))
                        .font(.system(size: 34, weight: .bold, design: .rounded)).monospacedDigit()
                        .foregroundStyle(walking ? walkGreen : .primary)
                    Text("km").font(.footnote).foregroundStyle(.secondary)
                }
            }
            Spacer(minLength: 0)
            Image(systemName: walking ? "figure.walk" : "figure.stand")
                .font(.title2).foregroundStyle(walking ? walkGreen : .secondary)
        }
        .padding(.vertical, 6)
        .onReceive(tick) { now = $0 }
        .listRowBackground(
            RoundedRectangle(cornerRadius: 12)
                .fill(Color.white.opacity(0.08))
                .overlay(RoundedRectangle(cornerRadius: 12).strokeBorder(walkGreen, lineWidth: 2).opacity(walking ? 1 : 0))
        )
    }
}
