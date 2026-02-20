#include "graph.hpp"
#include <thread>

// Constructor por defecto
Graph::Graph() : n_(0) {}

// Constructor int n
Graph::Graph(int n) {
    resize(n);
}

// Redimensiona el grafo
void Graph::resize(int n) {
    n_ = n;
    adj_.assign(n+1, {});                  // Lista de adyacencia vacía
    if (points_.empty()) {
        points_.assign(n+1, {0.0, 0.0});   // Posiciones en (0,0) por defecto
    } else {
        points_.resize(n+1, {0.0, 0.0});   // Redimensionar manteniendo datos existentes
    }
}

// Añade una arista
void Graph::NewEdge(int u, int v, int w) {
    if (u < 0 || u > n_) return;           // Validar nodo origen
    if (v < 0 || v > n_) return;           // Validar nodo destino
    adj_[u].push_back({v, w});             // Añadir arista a la lista
}

// Establece una posición
void Graph::SetNewPoint(int u, double longitude, double latitude) {
    if (u < 0 || u > n_) return;           // Validar nodo
    points_[u] = {longitude, latitude};    // Guardar posiciones
}

// Size
int Graph::size() const {
    return n_;
}

// Retorna la lista de vecinos
const std::vector<Graph::Edge>& Graph::neighbors(int u) const {
    return adj_[u];
}

// Construye el grafo inverso (Paralelizado)
void Graph::BuildReverseGraph() {
    adj_reverse_.assign(n_ + 1, {});
    // Procesamiento paralelo con hilos
    int H = std::thread::hardware_concurrency();
    if (H == 0) H = 4;
    std::vector<std::vector<std::vector<Edge>>> local_reverse(H, std::vector<std::vector<Edge>>(n_ + 1));
    std::vector<std::thread> threads;
    threads.reserve(H);
    // Divide el rango de nodos entre los hilos
    int nodes_per_thread = (n_ + 1) / H;
    for (int i = 0; i < H; ++i) {
        int start = i * nodes_per_thread;
        int end = (i == H - 1) ? (n_ + 1) : start + nodes_per_thread; 
        threads.emplace_back([&, i, start, end] {
            for (int u = start; u < end; ++u) {
                for (const auto& [v, w] : adj_[u]) {
                    local_reverse[i][v].push_back({u, w});
                }
            }
        });
    }
    // Espera a que terminen todos los hilos
    for (auto& t : threads) {
        if (t.joinable()) t.join();
    }
    // Combina los resultados locales en adj_reverse_ (Carga)
    for (int v = 0; v <= n_; ++v) {
        for (int i = 0; i < H; ++i) {
            adj_reverse_[v].insert(adj_reverse_[v].end(), 
                                   local_reverse[i][v].begin(), 
                                   local_reverse[i][v].end());
        }
    }
}

// Retorna los vecinos en el grafo inverso
const std::vector<Graph::Edge>& Graph::neighbors_reverse(int u) const {
    return adj_reverse_[u];
}

// Obtiene latitud y longitud
std::pair<double, double> Graph::getC(int u) const {
    if (u >= 0 && u <= n_) {
        return points_[u];
    }
    return {0.0, 0.0};
}
